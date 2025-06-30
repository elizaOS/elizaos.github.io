import { createStep, pipe } from "../types";
import { IngestionPipelineContext } from "./context";
import { db } from "@/lib/data/db";
import { users, walletAddresses } from "@/lib/data/schema";
import { getActiveContributors as getAllContributors } from "../getActiveContributors";
import { and, eq } from "drizzle-orm";
import {
  getChainId,
  SUPPORTED_CHAINS_NAMES,
  validateAddress,
  getPrimaryDomain,
} from "@/lib/walletLinking/chainUtils";
import { batchFetchWalletDataFromGithub } from "../../walletLinking/fetchWalletDataFromGithub";
import { chunk } from "@/lib/arrayHelpers";

interface WalletAddressIngestResult {
  username: string;
  status: "updated" | "no-wallets" | "failed";
}

const ingestWalletAddresses = createStep(
  "ingestContributorWalletAddresses",
  async (
    contributors: (typeof users.$inferSelect)[],
    context: IngestionPipelineContext,
  ) => {
    const { github, logger } = context;
    const results: WalletAddressIngestResult[] = [];

    if (contributors.length === 0) {
      return results;
    }
    logger?.info(
      `Fetching wallet data for  ${contributors.length} contributors.`,
    );

    const contributorBatches = chunk(contributors, 50);

    for (const batch of contributorBatches) {
      const usernames = batch.map((c) => c.username);
      logger?.info(
        `Processing batch of ${batch.length} contributors for wallet data.`,
      );
      try {
        const walletDataMap = await batchFetchWalletDataFromGithub(
          usernames,
          github,
        );

        const usersWithNoWallets: string[] = [];
        for (const contributor of batch) {
          const { username } = contributor;
          const freshWalletData = walletDataMap[username]?.walletData;

          if (
            !freshWalletData?.wallets ||
            freshWalletData.wallets.length === 0
          ) {
            usersWithNoWallets.push(username);
            await db
              .update(users)
              .set({
                walletDataUpdatedAt: Math.floor(Date.now() / 1000),
              })
              .where(eq(users.username, username));
            results.push({ username, status: "no-wallets" as const });
            continue;
          }

          logger?.debug(
            `Found ${freshWalletData.wallets.length} wallets for ${username}. Processing...`,
          );

          await db
            .update(walletAddresses)
            .set({
              isActive: false,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(walletAddresses.userId, username));

          let insertedCount = 0;
          let reactivatedCount = 0;
          let skippedCount = 0;

          for (const wallet of freshWalletData.wallets) {
            if (
              !SUPPORTED_CHAINS_NAMES.includes(wallet.chain.toLowerCase()) ||
              !validateAddress(wallet.address, wallet.chain)
            ) {
              logger?.warn(
                `Skipping invalid wallet for ${username}: ${wallet.address} on chain ${wallet.chain}`,
              );
              skippedCount++;
              continue;
            }

            // Get the primary domain name for the wallet address
            const primaryDomain = await getPrimaryDomain(
              wallet.address,
              wallet.chain,
            );

            const existingWallet = await db.query.walletAddresses.findFirst({
              where: and(
                eq(walletAddresses.userId, username),
                eq(walletAddresses.chainId, getChainId(wallet.chain)),
                eq(walletAddresses.accountAddress, wallet.address),
              ),
            });

            if (existingWallet) {
              await db
                .update(walletAddresses)
                .set({
                  isActive: true,
                  updatedAt: new Date().toISOString(),
                  domainName: primaryDomain,
                })
                .where(eq(walletAddresses.id, existingWallet.id));
              reactivatedCount++;
            } else {
              await db.insert(walletAddresses).values({
                userId: username,
                chainId: getChainId(wallet.chain),
                accountAddress: wallet.address,
                domainName: primaryDomain,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              insertedCount++;
            }
          }

          await db
            .update(users)
            .set({
              walletDataUpdatedAt: Math.floor(Date.now() / 1000),
            })
            .where(eq(users.username, username));
          logger?.info(`Successfully processed wallet data for ${username}.`, {
            insertedCount,
            reactivatedCount,
            skippedCount,
          });
          results.push({
            username: contributor.username,
            status: "updated" as const,
          });
        }
        if (usersWithNoWallets.length > 0) {
          logger?.info(
            `No wallets found for ${usersWithNoWallets.length} users on GitHub`,
            { users: usersWithNoWallets },
          );
        }
      } catch (error) {
        logger?.error(`Failed to process wallet data batch`, {
          error: String(error),
        });
        for (const contributor of batch) {
          results.push({
            username: contributor.username,
            status: "failed" as const,
          });
        }
      }
    }
    return results;
  },
);

const getContributorsForWalletIngestion = createStep(
  "getActiveContributors",
  async (_, context: IngestionPipelineContext) => {
    const { dateRange, config, logger } = context;

    if (!config.walletAddresses.enabled) {
      logger?.info("Wallet address ingestion is disabled. Skipping.");
      return [];
    }

    logger?.info(
      `Fetching active contributors since ${dateRange?.startDate || "beginning"} for wallet address ingestion.`,
    );
    const queryParams = {
      dateRange: dateRange || {
        startDate: "1970-01-01",
        endDate: "2100-01-01",
      },
    };

    const activeContributors = await getAllContributors(queryParams);
    logger?.info(
      `Found ${activeContributors.length} active contributors to process.`,
    );
    return activeContributors;
  },
);

export const fetchWalletAddresses = pipe(
  getContributorsForWalletIngestion,
  ingestWalletAddresses,
  createStep("summarizeResults", (results, context) => {
    const summary = results.reduce(
      (acc, result: WalletAddressIngestResult) => {
        if (result.status) {
          acc[result.status] = (acc[result.status] || 0) + 1;
        }
        return acc;
      },
      {
        updated: 0,
        "no-wallets": 0,
        failed: 0,
      },
    );

    const successCount = summary.updated + summary["no-wallets"];
    const errorCount = summary.failed;

    context.logger?.info(
      `Wallet address ingestion complete. Success: ${successCount}, Failed: ${errorCount}.`,
      {
        updated: summary.updated,
        noWallets: summary["no-wallets"],
      },
    );

    return {
      successCount,
      errorCount,
      ...summary,
    };
  }),
);
