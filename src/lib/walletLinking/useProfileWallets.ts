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
      const walletData = parseWalletLinkingDataFromReadme(decodedReadmeText);
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
    [user, setError, setSuccessMessage, setPageLoading],
  );

  return {
    user,
    authLoading,
    readmeContent,
    profileRepoExists,
    walletSection,
    walletData,
    pageLoading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    getWalletAddress,
    handleCreateProfileRepo,
    handleGenerateWalletSection,
    defaultBranch,
  };
}
