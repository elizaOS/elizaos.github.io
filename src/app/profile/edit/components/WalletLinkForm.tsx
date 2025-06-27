"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Info, Shield, ArrowRight } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LinkedWallet } from "@/lib/walletLinking/readmeUtils";
import { validateAddress } from "@/lib/walletLinking/chainUtils";
import {
  validateEnsFormat,
  validateSnsFormat,
} from "@/lib/walletLinking/domainUtils";

// Zod schema for form validation
const walletFormSchema = z.object({
  ethereum: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim() === "") return true;
        const isEVMValid = validateAddress(value, "ethereum");
        const isENSValid = validateEnsFormat(value);
        return isEVMValid || isENSValid;
      },
      {
        message: "Invalid Ethereum address or ENS name.",
      },
    ),
  solana: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim() === "") return true;
        const isSOLValid = validateAddress(value, "solana");
        const isSNSValid = validateSnsFormat(value);
        return isSOLValid || isSNSValid;
      },
      {
        message: "Invalid Solana address or SNS name.",
      },
    ),
});

type WalletFormValues = z.infer<typeof walletFormSchema>;

interface WalletLinkFormProps {
  wallets: LinkedWallet[];
  processWallets: (values: WalletFormValues) => Promise<LinkedWallet[]>;
  onSubmit: (wallets: LinkedWallet[]) => Promise<void>;
  isProcessing: boolean;
}

export function WalletLinkForm({
  wallets = [],
  processWallets,
  onSubmit,
  isProcessing,
}: WalletLinkFormProps) {
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      ethereum: "",
      solana: "",
    },
    mode: "onChange",
  });

  // Initialize form with existing wallet addresses
  useEffect(() => {
    const ethWallet = wallets.find((w) => w.chain === "ethereum");
    const solWallet = wallets.find((w) => w.chain === "solana");

    form.reset({
      ethereum: ethWallet?.address || "",
      solana: solWallet?.address || "",
    });
  }, [wallets, form]);

  const handleFormSubmit = async (values: WalletFormValues) => {
    try {
      const processedWallets = await processWallets(values);
      await onSubmit(processedWallets);
    } catch (error) {
      // Handle specific field errors from wallet processing
      if (error instanceof Error && "field" in error) {
        const fieldError = error as {
          field: "ethereum" | "solana";
          message: string;
        };
        form.setError(fieldError.field, { message: fieldError.message });
        return;
      }

      // Handle general errors
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to process wallet addresses. Please try again.",
      });
    }
  };

  // Button text logic (keep separate due to complexity)
  const canSubmit =
    form.formState.isValid && !isProcessing && form.formState.isDirty;
  const isUpdateOperation = wallets.length > 0;
  const buttonText = isProcessing
    ? `${isUpdateOperation ? "Updating" : "Saving"}...`
    : `${isUpdateOperation ? "Update" : "Save"} Wallet Addresses`;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="ethereum"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ethereum Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Your Ethereum address (e.g., 0x...) or ENS name (e.g., vitalik.eth)"
                  disabled={isProcessing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="solana"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Solana Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Your Solana address (e.g., So1...) or SNS name (e.g., example.sol)"
                  disabled={isProcessing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
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
                <span className="font-medium">Public addresses only:</span>{" "}
                Enter your wallet addresses to link them to your GitHub profile.
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
    </Form>
  );
}
