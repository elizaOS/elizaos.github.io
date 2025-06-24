"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Info, Shield, ArrowRight } from "lucide-react";
import {
  getViemClient,
  isAddress as isEvmAddressAsync,
  normalizeEns,
} from "@/lib/walletLinking/viem";
import { LinkedWallet } from "@/lib/walletLinking/readmeUtils";
import { resolveSolDomain } from "@/lib/walletLinking/sns";

interface WalletLinkFormProps {
  wallets: LinkedWallet[];
  onSubmit: (wallets: LinkedWallet[]) => Promise<void>;
  isProcessing: boolean;
}

// Basic regex for Solana address (Base58, 32-44 chars)
// For more robust validation, consider @solana/web3.js PublicKey.isOnCurve or similar
const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ENS name regex (name.eth format)
// Matches names that end with .eth and contain valid characters
const ENS_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.eth$/;

// SNS name regex (name.sol format)
// Matches names that end with .sol and contain valid characters
const SNS_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.sol$/;

export function WalletLinkForm({
  wallets = [],
  onSubmit,
  isProcessing,
}: WalletLinkFormProps) {
  const [ethAddress, setEthAddress] = useState("");
  const [solAddress, setSolAddress] = useState("");

  const [ethAddressError, setEthAddressError] = useState("");
  const [solAddressError, setSolAddressError] = useState("");

  const [isEthValid, setIsEthValid] = useState(true);
  const [isSolValid, setIsSolValid] = useState(true);

  // Initialize form with existing wallet addresses
  useEffect(() => {
    const ethWallet = wallets.find((w) => w.chain === "ethereum");
    const solWallet = wallets.find((w) => w.chain === "solana");

    setEthAddress(ethWallet?.address || "");
    setSolAddress(solWallet?.address || "");

    // Validate initial addresses asynchronously
    const validateInitialAddresses = async () => {
      if (ethWallet?.address) {
        const isValid = await isEvmAddressAsync(ethWallet.address);
        setIsEthValid(isValid);
        if (!isValid) {
          setEthAddressError("Invalid Ethereum address");
        }
      }

      if (solWallet?.address) {
        const isValid = SOL_ADDRESS_REGEX.test(solWallet.address);
        setIsSolValid(isValid);
        if (!isValid) {
          setSolAddressError("Invalid Solana address");
        }
      }
    };

    validateInitialAddresses();
  }, [wallets]);

  useEffect(() => {
    if (ethAddress === "") {
      setIsEthValid(true);
      setEthAddressError("");
      return;
    }

    const validateEthAddress = async () => {
      const isEVMValid = await isEvmAddressAsync(ethAddress);
      const isENSValid = ENS_NAME_REGEX.test(ethAddress);
      setIsEthValid(isEVMValid || isENSValid);
      setEthAddressError(
        isEVMValid || isENSValid ? "" : "Invalid Ethereum address or ENS name.",
      );
    };

    validateEthAddress();
  }, [ethAddress]);

  useEffect(() => {
    if (solAddress === "") {
      setIsSolValid(true);
      setSolAddressError("");
      return;
    }

    const isSOLValid = SOL_ADDRESS_REGEX.test(solAddress);
    const isSNSValid = SNS_NAME_REGEX.test(solAddress);
    setIsSolValid(isSNSValid || isSOLValid);
    setSolAddressError(
      isSNSValid || isSOLValid ? "" : "Invalid Solana address or SNS name.",
    );
  }, [solAddress]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Double check validity before submitting
    if (!isEthValid || !isSolValid) {
      return;
    }

    const updatedWallets: LinkedWallet[] = [];

    if (ethAddress) {
      const isENSValid = ENS_NAME_REGEX.test(ethAddress);
      let address: string | null = ethAddress;

      if (isENSValid) {
        const viemClient = await getViemClient();
        const normalizedName = await normalizeEns(ethAddress);
        address = await viemClient.getEnsAddress({ name: normalizedName });
      }

      // If the address is not found, set the error and return
      if (!address) {
        setEthAddressError("Invalid Ethereum address or ENS name.");
        return;
      }

      updatedWallets.push({
        chain: "ethereum",
        address,
        ...(isENSValid && { ensName: ethAddress }),
      });
    }

    if (solAddress) {
      const isSNSValid = SNS_NAME_REGEX.test(solAddress);
      const address = isSNSValid
        ? await resolveSolDomain(solAddress)
        : solAddress;

      // If the address is not found, set the error and return
      if (!address) {
        setSolAddressError("Invalid Solana address or SNS name.");
        return;
      }

      updatedWallets.push({
        chain: "solana",
        address,
        ...(isSNSValid && { snsName: solAddress }),
      });
    }

    await onSubmit(updatedWallets);
  };

  const hasValuesChanged =
    ethAddress !==
      (wallets.find((w) => w.chain === "ethereum")?.address || "") ||
    solAddress !== (wallets.find((w) => w.chain === "solana")?.address || "");
  const canSubmit =
    isEthValid && isSolValid && !isProcessing && hasValuesChanged;

  const isUpdateOperation = wallets.length > 0;
  const buttonTextBase = isUpdateOperation ? "Update" : "Save";
  const buttonText = isProcessing
    ? `${buttonTextBase === "Update" ? "Updating" : "Saving"}...`
    : `${buttonTextBase} Wallet Addresses`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ethAddress">Ethereum Address</Label>
        <Input
          id="ethAddress"
          type="text"
          value={ethAddress}
          onChange={(e) => setEthAddress(e.target.value)}
          placeholder="Your Ethereum address (e.g., 0x...) or ENS name (e.g., vitalik.eth)"
          disabled={isProcessing}
          className={ethAddressError ? "border-destructive" : ""}
        />
        {ethAddressError && (
          <p className="text-sm text-destructive">{ethAddressError}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="solAddress">Solana Address</Label>
        <Input
          id="solAddress"
          type="text"
          value={solAddress}
          onChange={(e) => setSolAddress(e.target.value)}
          placeholder="Your Solana address (e.g., So1...) or SNS name (e.g., example.sol)"
          disabled={isProcessing}
          className={solAddressError ? "border-destructive" : ""}
        />
        {solAddressError && (
          <p className="text-sm text-destructive">{solAddressError}</p>
        )}
      </div>
      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {buttonText}
      </Button>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-start space-x-2">
          <Info className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1 text-xs">
            <p className="text-foreground">
              <span className="font-medium">Public addresses only:</span> Enter
              your wallet addresses to link them to your GitHub profile.
            </p>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Never share private keys or seed phrases</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>Submit to generate README comment for copying</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
