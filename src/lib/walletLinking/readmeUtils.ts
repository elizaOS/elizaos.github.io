import { z } from "zod";
import {
  SUPPORTED_CHAINS_NAMES,
  validateAddress,
} from "@/lib/walletLinking/chainUtils";

export const LinkedWalletSchema = z.object({
  chain: z.string().min(1).toLowerCase(),
  address: z.string().min(1),
  signature: z.string().min(1).optional(),
});

export const WalletLinkingDataSchema = z.object({
  lastUpdated: z.string().datetime(),
  wallets: z.array(LinkedWalletSchema),
});

export type LinkedWallet = z.infer<typeof LinkedWalletSchema>;
export type WalletLinkingData = z.infer<typeof WalletLinkingDataSchema>;

const WALLET_SECTION_BEGIN_MARKER = "<!-- WALLET-LINKING-BEGIN";
const WALLET_SECTION_END_MARKER = "WALLET-LINKING-END -->";

/**
 * Parses wallet linking data from a given README content string.
 * Data is expected to be in JSON format within specific comment markers.
 * @param readmeContent The string content of the README file.
 * @returns The parsed and validated wallet linking data, or null if no valid data found.
 */
export function parseWalletLinkingDataFromReadme(
  readmeContent: string,
): WalletLinkingData | null {
  const startIndex = readmeContent.indexOf(WALLET_SECTION_BEGIN_MARKER);
  const endIndex = readmeContent.indexOf(WALLET_SECTION_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const walletSectionContent = readmeContent
    .substring(startIndex + WALLET_SECTION_BEGIN_MARKER.length, endIndex)
    .trim();

  try {
    // Parse the JSON directly from the comment content
    const rawData = JSON.parse(walletSectionContent);

    // Validate the data structure using Zod
    const result = WalletLinkingDataSchema.safeParse(rawData);

    if (!result.success) {
      console.error("Invalid wallet linking data:", result.error);
      return null;
    }

    // Make sure to only return wallets for supported chains
    const walletLinkingData: WalletLinkingData = {
      lastUpdated: result.data.lastUpdated,
      wallets: result.data.wallets.filter(
        (wallet) =>
          SUPPORTED_CHAINS_NAMES.includes(wallet.chain.toLowerCase()) &&
          validateAddress(wallet.address, wallet.chain),
      ),
    };

    return walletLinkingData;
  } catch (error) {
    console.error("Error parsing wallet linking data:", error);
    return null;
  }
}

/**
 * Generates an updated README content string with the provided wallet linking data.
 * It will replace an existing wallet section if found, or append a new one.
 * The wallet information is stored as JSON in a hidden HTML comment.
 * @param currentReadme The current content of the README file.
 * @param wallets Array of wallet information to store.
 * @returns The updated README content string.
 */
export function generateUpdatedReadmeWithWalletInfo(
  currentReadme: string,
  wallets: LinkedWallet[],
): { updatedReadme: string; walletData: WalletLinkingData } {
  // Validate wallets array using Zod before generating content
  const validatedWallets = z.array(LinkedWalletSchema).parse(wallets);

  const walletData: WalletLinkingData = {
    lastUpdated: new Date().toISOString(),
    wallets: validatedWallets.map((wallet) => ({
      chain: wallet.chain.toLowerCase().trim(),
      address: wallet.address.trim(),
      ...(wallet.signature ? { signature: wallet.signature.trim() } : {}),
    })),
  };

  // Validate the complete data structure
  const validatedData = WalletLinkingDataSchema.parse(walletData);

  const walletSection = `${WALLET_SECTION_BEGIN_MARKER}
${JSON.stringify(validatedData, null, 2)}
${WALLET_SECTION_END_MARKER}`;

  const startIndex = currentReadme.indexOf(WALLET_SECTION_BEGIN_MARKER);
  const endIndex = currentReadme.indexOf(WALLET_SECTION_END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const updatedReadme =
      currentReadme.substring(0, startIndex) +
      walletSection +
      currentReadme.substring(endIndex + WALLET_SECTION_END_MARKER.length);
    return { updatedReadme, walletData };
  } else {
    const separator =
      currentReadme.trim() && !currentReadme.endsWith("\n")
        ? "\n\n"
        : currentReadme.trim()
          ? "\n"
          : "";
    return {
      updatedReadme: currentReadme.trim() + separator + walletSection,
      walletData,
    };
  }
}

/**
 * Generates the wallet section content for a README file
 * @param wallets Array of wallet information to store
 * @returns The formatted wallet section string with markers
 */
export function generateReadmeWalletSection(wallets: LinkedWallet[]): string {
  // Validate wallets array using Zod before generating content
  const validatedWallets = z.array(LinkedWalletSchema).parse(wallets);

  const walletData: WalletLinkingData = {
    lastUpdated: new Date().toISOString(),
    wallets: validatedWallets.map((wallet) => ({
      chain: wallet.chain.toLowerCase().trim(),
      address: wallet.address.trim(),
      ...(wallet.signature ? { signature: wallet.signature.trim() } : {}),
    })),
  };

  // Validate the complete data structure
  const validatedData = WalletLinkingDataSchema.parse(walletData);

  return `${WALLET_SECTION_BEGIN_MARKER}
${JSON.stringify(validatedData, null, 2)}
${WALLET_SECTION_END_MARKER}`;
}

/**
 * Helper function to get a wallet address for a specific chain
 * @param data The wallet linking data
 * @param chain The chain to look for (case insensitive)
 * @returns The wallet address or empty string if not found
 */
export function getWalletAddressForChain(
  data: WalletLinkingData | null,
  chain: string,
): string {
  if (!data) return "";
  const wallet = data.wallets.find(
    (w) => w.chain.toLowerCase() === chain.toLowerCase(),
  );
  return wallet?.address || "";
}
