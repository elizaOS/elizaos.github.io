import "server-only";
import { GitHubClient } from "@/lib/data/github";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";
import { decodeBase64 } from "../decode";
import { db } from "@/lib/data/db";
import { users, walletAddresses } from "@/lib/data/schema";
import { eq, and } from "drizzle-orm";
import {
  getChainId,
  getChainByChainId,
  validateAddress,
  SUPPORTED_CHAINS_NAMES,
} from "@/lib/walletLinking/chainUtils";

const CACHE_DURATION_SECONDS = 12 * 60 * 60; // 12 hours

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is not set");
}
const githubClient = new GitHubClient(process.env.GITHUB_TOKEN);

/**
 * Fetches a user's profile README from GitHub and parses the wallet linking data.
 * This is the core function for fetching data from GitHub without caching.
 * Uses unauthenticated GitHub API.
 *
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to wallet linking data or null if not found/error
 */
async function fetchWalletDataFromGithub(
  username: string,
): Promise<WalletLinkingData | null> {
  try {
    const readmeData = await githubClient.fetchFileContent(
      username,
      username,
      "README.md",
    );

    if (!readmeData?.content) {
      return null;
    }
    const decodedReadmeText = decodeBase64(readmeData.content);
    const walletData = parseWalletLinkingDataFromReadme(decodedReadmeText);
    return walletData;
  } catch (err) {
    console.error(
      `Exception fetching or parsing README for user ${username}:`,
      err,
    );
    return null;
  }
}

/**
 * Retrieves user wallet data, utilizing a cache first, then falling back to GitHub.
 * Updates the cache after fetching from GitHub.
 *
 * @param username The GitHub username
 * @returns A promise resolving to wallet linking data or null
 */
export async function getCachedUserWalletData(
  username: string,
): Promise<WalletLinkingData | null> {
  try {
    // Get user record to check wallet data update timestamp
    const userRecord = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        walletDataUpdatedAt: true,
      },
    });

    if (!userRecord) {
      return null;
    }

    // Check if we have cached wallet data that's still fresh
    if (
      userRecord.walletDataUpdatedAt &&
      Date.now() / 1000 - userRecord.walletDataUpdatedAt <
        CACHE_DURATION_SECONDS
    ) {
      // Cache is fresh, get wallet addresses from walletAddresses table
      const cachedWallets = await db.query.walletAddresses.findMany({
        where: and(
          eq(walletAddresses.userId, username),
          eq(walletAddresses.isActive, true),
        ),
        columns: {
          chainId: true,
          accountAddress: true,
        },
      });

      if (cachedWallets.length > 0) {
        const wallets = cachedWallets.map((wallet) => ({
          chain: getChainByChainId(wallet.chainId),
          address: wallet.accountAddress,
          source: "cache",
        }));

        return {
          wallets,
          lastUpdated: userRecord.walletDataUpdatedAt.toString(),
        };
      }

      // Fresh cache, but no wallet addresses found
      return null;
    }

    // Cache is stale or doesn't exist, fetch from GitHub
    const freshWalletData = await fetchWalletDataFromGithub(username);

    if (!freshWalletData?.wallets || freshWalletData.wallets.length === 0) {
      // Update timestamp even if no wallets found to avoid repeated GitHub API calls
      await db
        .update(users)
        .set({
          walletDataUpdatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(users.username, username));

      return null;
    }

    // Update the walletAddresses table with fresh data
    // First, deactivate all existing wallet addresses for this user
    await db
      .update(walletAddresses)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(walletAddresses.userId, username));

    // Insert or reactivate wallet addresses
    for (const wallet of freshWalletData.wallets) {
      // Validate chain is supported and address is valid before DB operations
      if (
        !SUPPORTED_CHAINS_NAMES.includes(wallet.chain.toLowerCase()) ||
        !validateAddress(wallet.address, wallet.chain)
      ) {
        continue;
      }

      // Check if this wallet already exists
      const existingWallet = await db.query.walletAddresses.findFirst({
        where: and(
          eq(walletAddresses.userId, username),
          eq(walletAddresses.chainId, getChainId(wallet.chain)),
          eq(walletAddresses.accountAddress, wallet.address),
        ),
      });

      if (existingWallet) {
        // Reactivate existing wallet
        await db
          .update(walletAddresses)
          .set({
            isActive: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(walletAddresses.id, existingWallet.id));
      } else {
        // Insert new wallet address
        await db.insert(walletAddresses).values({
          userId: username,
          chainId: getChainId(wallet.chain),
          accountAddress: wallet.address,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Update user's wallet data timestamp
    await db
      .update(users)
      .set({
        walletDataUpdatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(users.username, username));

    return freshWalletData;
  } catch (error) {
    console.error(`Error in getCachedUserWalletData for ${username}:`, error);
    return null;
  }
}
