import * as githubService from "./githubService";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";
import { decodeBase64 } from "../decode";
import { githubClient } from "@/lib/data/github";

export interface WalletLinkingResponse {
  walletData: WalletLinkingData | null;
  readmeContent: string | null;
  readmeSha: string | undefined;
  profileRepoExists: boolean;
}

/**
 * Fetches a user's profile README from GitHub and parses the wallet linking data.
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
      return {
        walletData: null,
        readmeContent: "",
        readmeSha: fileData?.sha,
        profileRepoExists: true,
      };
    }
  } catch (error) {
    console.error(`Error fetching README data for user ${username}:`, error);
    return {
      walletData: null,
      readmeContent: null,
      readmeSha: undefined,
      profileRepoExists: false,
    };
  }
}

/**
 * Fetches a user's profile README from GitHub and extracts wallet linking data.
 * This version uses the unified GitHub client with proper rate limiting.
 *
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to wallet linking data or null if not found/error
 */
export async function getUserWalletData(
  username: string,
): Promise<WalletLinkingData | null> {
  try {
    const fileData = await githubClient.fetchFileContent(
      username,
      username,
      "README.md",
    );
    if (!fileData || !fileData.content) {
      return null;
    }

    const decodedReadmeText = decodeBase64(fileData.content);
    const walletData = parseWalletLinkingDataFromReadme(decodedReadmeText);
    return walletData;
  } catch (error) {
    console.error(`Error fetching README data for user ${username}:`, error);
    return null;
  }
}
