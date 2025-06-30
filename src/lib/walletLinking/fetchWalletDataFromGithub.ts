import { BatchFileContentResult, GitHubClient } from "@/lib/data/github";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "@/lib/walletLinking/readmeUtils";

interface WalletDataResponse {
  walletData: WalletLinkingData | null;
  profileRepoExists: boolean;
}

interface BatchWalletDataResponse {
  [username: string]: WalletDataResponse;
}

export async function batchFetchWalletDataFromGithub(
  usernames: string[],
  githubClient: GitHubClient,
): Promise<BatchWalletDataResponse> {
  if (usernames.length === 0) {
    return {};
  }

  const requests = usernames.map((username) => ({
    owner: username,
    repo: username,
    path: "README.md",
  }));

  try {
    const fileContents: BatchFileContentResult[] =
      await githubClient.batchFetchFileContents(requests);

    const results: BatchWalletDataResponse = {};
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const result = fileContents[i];

      if (result.content) {
        const walletData = parseWalletLinkingDataFromReadme(result.content);
        results[username] = {
          walletData,
          profileRepoExists: true,
        };
      } else {
        results[username] = {
          walletData: null,
          profileRepoExists: result.repoExists,
        };
      }
    }
    return results;
  } catch (err) {
    console.error(`Exception in batch fetching READMEs:`, {
      error: String(err),
    });
    const errorResponse: BatchWalletDataResponse = {};
    for (const username of usernames) {
      errorResponse[username] = {
        walletData: null,
        profileRepoExists: false,
      };
    }
    return errorResponse;
  }
}

export async function fetchWalletDataFromGithub(
  username: string,
  githubClient: GitHubClient,
): Promise<WalletDataResponse> {
  const results = await batchFetchWalletDataFromGithub(
    [username],
    githubClient,
  );
  return results[username] ?? { walletData: null, profileRepoExists: false };
}
