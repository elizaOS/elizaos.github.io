"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LinkedWallet,
  WalletLinkingData,
  getWalletAddressForChain,
  LinkedWalletSchema,
  parseWalletLinkingDataFromReadme,
  generateReadmeWalletSection,
} from "@/lib/walletLinking/readmeUtils";
import { z } from "zod";
import { decodeBase64 } from "@/lib/decode";
import {
  resolveSnsDomain,
  resolveEnsDomain,
  validateEnsFormat,
  validateSnsFormat,
} from "@/lib/walletLinking/domainUtils";

export function useProfileWallets() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [profileRepoExists, setProfileRepoExists] = useState<boolean | null>(
    null,
  );
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletLinkingData | null>(null);
  const [walletSection, setWalletSection] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>("main");

  const [pageLoading, setPageLoading] = useState(true);
  const [isProcessingWallets, setIsProcessingWallets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfileData = useCallback(async (currentLogin: string) => {
    setPageLoading(true);
    setError(null);
    try {
      // check if the Repo exists
      const repoUrl = `https://api.github.com/repos/${currentLogin}/${currentLogin}`;
      const repoResponse = await fetch(repoUrl);
      if (!repoResponse.ok) {
        setProfileRepoExists(false);
        // Default to 'main' if repo fetch fails or repo doesn't exist
        setDefaultBranch("main");
        return;
      }
      const repoData = await repoResponse.json();
      setDefaultBranch(repoData.default_branch || "main");
      setProfileRepoExists(true);

      // check if the Readme exists
      const readmeUrl = `https://api.github.com/repos/${currentLogin}/${currentLogin}/contents/README.md`;
      const readmeResponse = await fetch(readmeUrl, {
        cache: "no-store",
      });
      if (!readmeResponse.ok) {
        return;
      }
      const readmeData = await readmeResponse.json();
      const decodedReadmeText = decodeBase64(readmeData.content);
      setReadmeContent(decodedReadmeText);

      // parse Readme content for Wallet data
      const walletData =
        await parseWalletLinkingDataFromReadme(decodedReadmeText);
      setWalletData(walletData);
    } catch (err: unknown) {
      console.error("Error in fetchProfileData:", err);
      setError(
        err instanceof Error
          ? err.message || "Failed to load profile data."
          : "Unknown error loading profile data.",
      );
      setProfileRepoExists(null);
      setReadmeContent(null);
      setWalletData(null);
      // Default to 'main' on error
      setDefaultBranch("main");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.login) {
      if (!authLoading) {
        router.replace(
          "/auth/callback?error=unauthenticated&from=/profile/edit",
        );
      }
      return;
    }
    setPageLoading(true);
    fetchProfileData(user.login);
  }, [user, authLoading, router, fetchProfileData]);

  // Helper function to get a wallet address for a specific chain
  const getWalletAddress = useCallback(
    (chain: string): string => {
      return getWalletAddressForChain(walletData, chain);
    },
    [walletData],
  );

  const handleCreateProfileRepo = useCallback(async () => {
    if (!user || !user.login) {
      return;
    }
    setPageLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const createRepoUrl = `https://github.com/new?name=${user.login}&visibility=public`;
      window.open(createRepoUrl, "_blank");
    } catch (err: unknown) {
      console.error("Error opening GitHub repo creation URL:", err);
      setError(
        err instanceof Error
          ? err.message || "Failed to open repository creation page."
          : "Unknown error opening repository creation page.",
      );
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  /**
   * Processes form values and returns array of processed wallet objects
   * with wallet addresses and/or domain names
   */
  const processWallets = useCallback(
    async (
      values: Record<string, string | undefined>,
    ): Promise<LinkedWallet[]> => {
      setIsProcessingWallets(true);
      const wallets: LinkedWallet[] = [];

      try {
        for (const chainName of Object.keys(values)) {
          const addressValue = values[chainName];

          if (!addressValue?.trim()) {
            continue;
          }

          // Determine if this is a domain name based on chain type
          const isEns =
            chainName === "ethereum" && validateEnsFormat(addressValue);
          const isSns =
            chainName === "solana" && validateSnsFormat(addressValue);
          const isDomain = isEns || isSns;

          let finalAddress = addressValue;
          let ensName: string | undefined;
          let snsName: string | undefined;

          if (isDomain) {
            // Domain address - resolve to actual address
            const resolvedAddress = isEns
              ? await resolveEnsDomain(addressValue)
              : await resolveSnsDomain(addressValue);

            if (!resolvedAddress) {
              // Resolution failed - throw error with field information
              const domainType = isEns ? "ENS" : "SNS";
              const error = new Error(
                `Failed to resolve ${domainType} name. Please check the domain.`,
              ) as Error & { field: string };
              error.field = chainName;
              throw error;
            }

            finalAddress = resolvedAddress;
            if (isEns) ensName = addressValue;
            if (isSns) snsName = addressValue;
          }

          // Create wallet object
          const wallet: LinkedWallet = {
            chain: chainName,
            address: finalAddress,
            ...(ensName && { ensName }),
            ...(snsName && { snsName }),
          };

          wallets.push(wallet);
        }

        return wallets;
      } catch (error) {
        // Re-throw errors (including ones with field property) for the component to handle
        throw error;
      } finally {
        setIsProcessingWallets(false);
      }
    },
    [],
  );

  const handleGenerateWalletSection = useCallback(
    async (wallets: LinkedWallet[]) => {
      if (!user || !user.login) {
        return;
      }
      setPageLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        // Validate wallets before proceeding
        const validatedWallets = z.array(LinkedWalletSchema).parse(wallets);

        // Generate updated README content
        const walletSection = generateReadmeWalletSection(validatedWallets);
        setWalletSection(walletSection);
      } catch (err: unknown) {
        console.error("Error in handleLinkWallets:", err);
        if (err instanceof z.ZodError) {
          const errors = err.errors
            .map((e) => {
              const path = e.path.join(".");
              return `${path ? path + ": " : ""}${e.message}`;
            })
            .join("; ");
          setError(`Invalid wallet data: ${errors}`);
        } else {
          setError(
            err instanceof Error
              ? err.message || "Failed to process wallet data."
              : "Unknown error processing wallet data.",
          );
        }
      } finally {
        setPageLoading(false);
      }
    },
    [user],
  );

  return {
    user,
    authLoading,
    readmeContent,
    profileRepoExists,
    walletSection,
    walletData,
    pageLoading,
    isProcessingWallets,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    getWalletAddress,
    handleCreateProfileRepo,
    processWallets,
    handleGenerateWalletSection,
    defaultBranch,
  };
}
