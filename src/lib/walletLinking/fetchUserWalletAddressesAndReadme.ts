import { decodeBase64 } from "../decode";
import { GitHubClient } from "@/lib/data/github";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";

export interface WalletLinkingResponse {
  walletData: WalletLinkingData | null;
  readmeContent: string | null;
  readmeSha: string | undefined;
  profileRepoExists: boolean;
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
    const githubClient = new GitHubClient(token);
    // Check if the profile repository exists
    const repo = await githubClient.getRepo(username, username);
    if (!repo) {
      return {
        walletData: null,
        readmeContent: null,
        readmeSha: undefined,
        profileRepoExists: false,
      };
    }

    // If repo exists, attempt to get README.md
    const fileData = await githubClient.fetchFileContent(
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
