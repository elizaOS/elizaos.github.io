import * as githubService from "./githubService";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";
import { decodeBase64 } from "../decode";
import { db } from "@/lib/data/db";
import { users } from "@/lib/data/schema";
import { eq } from "drizzle-orm";

export interface WalletLinkingResponse {
  walletData: WalletLinkingData | null;
  readmeContent: string | null;
  readmeSha: string | undefined;
  profileRepoExists: boolean;
}

const CACHE_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

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
    const readmeUrl = `https://api.github.com/repos/${username}/${username}/contents/README.md`;
    // Add Accept header for better API interaction & User-Agent as good practice
    const response = await fetch(readmeUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Eliza-Leaderboard-App",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // README not found, common case, not necessarily an error for wallet linking.
        // console.log(`README.md not found for user ${username}. No wallet data to parse.`);
        return null;
      }
      // Log other errors (rate limiting, server errors, etc.)
      console.error(
        `Error fetching README.md for ${username}. Status: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const readmeData = await response.json();
    if (!readmeData.content) {
      // console.log(`No content in README.md for user ${username}.`);
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
    const userRecord = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        ethAddress: true,
        solAddress: true,
        walletDataUpdatedAt: true,
      },
    });

    if (
      userRecord?.walletDataUpdatedAt &&
      Date.now() / 1000 - userRecord.walletDataUpdatedAt <
        CACHE_DURATION_SECONDS
    ) {
      // Cache is fresh
      if (userRecord.ethAddress || userRecord.solAddress) {
        const wallets = [];
        if (userRecord.ethAddress) {
          wallets.push({
            chain: "ethereum",
            address: userRecord.ethAddress,
            source: "cache",
          });
        }
        if (userRecord.solAddress) {
          wallets.push({
            chain: "solana",
            address: userRecord.solAddress,
            source: "cache",
          });
        }
        if (wallets.length > 0) {
          return {
            wallets,
            lastUpdated: userRecord.walletDataUpdatedAt.toString(),
          };
        }
      }
      // Fresh cache, and we know there are no addresses, or only null addresses were stored.
      return null;
    }

    // Cache is stale or user record doesn't have walletDataUpdatedAt, fetch from GitHub
    const freshWalletData = await fetchWalletDataFromGithub(username);

    const ethWallet = freshWalletData?.wallets.find(
      (w) => w.chain === "ethereum",
    );
    const solWallet = freshWalletData?.wallets.find(
      (w) => w.chain === "solana",
    );

    // Attempt to update. If the user doesn't exist, this will do nothing.
    // For a more robust solution, one might consider an upsert or ensuring user exists.
    await db
      .update(users)
      .set({
        ethAddress: ethWallet?.address || null,
        solAddress: solWallet?.address || null,
        walletDataUpdatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(users.username, username));

    return freshWalletData;
  } catch (error) {
    console.error(`Error in getCachedUserWalletData for ${username}:`, error);
    // Fallback or error handling strategy. For now, return null.
    return null;
  }
}

/**
 * Fetches a user's profile README from GitHub and parses the wallet linking data using an authenticated token.
 * This is the more comprehensive version.
 *
 * @param token GitHub token for authentication
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to an object with wallet data, README details, and repo status
 */
export async function fetchUserWalletAddressesAndReadme(
  token: string,
  username: string,
): Promise<WalletLinkingResponse> {
  try {
    // Check if the profile repository exists
    const repo = await githubService.getRepo(token, username, username);
    if (!repo) {
      return {
        walletData: null,
        readmeContent: null,
        readmeSha: undefined,
        profileRepoExists: false,
      };
    }

    // If repo exists, attempt to get README.md
    const fileData = await githubService.getFileContent(
      token,
      username,
      username,
      "README.md",
    );

    if (fileData && fileData.content) {
      const decodedContent = decodeBase64(fileData.content);
      const walletData = parseWalletLinkingDataFromReadme(decodedContent);

      return {
        walletData,
        readmeContent: decodedContent,
        readmeSha: fileData.sha,
        profileRepoExists: true,
      };
    } else {
      // Readme might exist but be empty, or other fileData issue
      return {
        walletData: null,
        readmeContent: fileData?.content === "" ? "" : null, // preserve empty string if that was the case
        readmeSha: fileData?.sha,
        profileRepoExists: true,
      };
    }
  } catch (error) {
    // Adding more specific error logging
    if (error instanceof Error) {
      console.error(
        `Error fetching README data for user ${username} (authenticated): ${error.message}`,
        error.stack,
      );
    } else {
      console.error(
        `Unknown error fetching README data for user ${username} (authenticated):`,
        error,
      );
    }
    return {
      walletData: null,
      readmeContent: null,
      readmeSha: undefined,
      profileRepoExists: false, // Assuming error means we can't confirm repo existence or readability
    };
  }
}
