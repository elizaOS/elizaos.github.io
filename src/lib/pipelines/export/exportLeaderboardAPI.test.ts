import { describe, expect, it, mock, beforeEach } from "bun:test";
import { setupTestDb } from "@/__testing__/helpers/db";
import {
  generateMockUsers,
  generateMockUserDailyScores,
  generateMockWalletAddresses,
} from "@/__testing__/helpers/mock-data";
import * as schema from "@/lib/data/schema";
import { toDateString } from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";
import {
  exportLeaderboardAPI,
  exportAllLeaderboardAPIs,
} from "./exportLeaderboardAPI";
import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";

describe("exportLeaderboardAPI", () => {
  let db: ReturnType<typeof setupTestDb>;
  const testOutputDir = "./test-data";

  beforeEach(() => {
    db = setupTestDb();
    mock.module("@/lib/data/db", () => ({ db }));

    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("exportLeaderboardAPI - monthly", () => {
    it("should export monthly leaderboard with correct structure", async () => {
      // Setup test data
      const users = generateMockUsers([
        { username: "user1", isBot: 0 },
        { username: "user2", isBot: 0 },
      ]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      const scores = generateMockUserDailyScores(
        [
          { username: "user1", score: 100, prScore: 80, issueScore: 20 },
          { username: "user2", score: 50, prScore: 40, issueScore: 10 },
        ],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      // Export
      await exportLeaderboardAPI(testOutputDir, "monthly");

      // Verify file exists
      const filePath = join(testOutputDir, "api", "leaderboard-monthly.json");
      expect(existsSync(filePath)).toBe(true);

      // Read and verify content
      const content = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(content.period).toBe("monthly");
      expect(content.totalUsers).toBe(2);
      expect(content.leaderboard).toHaveLength(2);

      // Verify top user
      expect(content.leaderboard[0].rank).toBe(1);
      expect(content.leaderboard[0].username).toBe("user1");
      expect(content.leaderboard[0].score).toBe(100);
      expect(content.leaderboard[0].prScore).toBe(80);

      // Verify second user
      expect(content.leaderboard[1].rank).toBe(2);
      expect(content.leaderboard[1].username).toBe("user2");
      expect(content.leaderboard[1].score).toBe(50);
    });

    it("should include wallet addresses when available", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const wallets = generateMockWalletAddresses([
        {
          userId: "user1",
          chainId: "eip155:1",
          accountAddress: "0x123...",
          isPrimary: true,
        },
        {
          userId: "user1",
          chainId: "mainnet-beta",
          accountAddress: "abc123...",
          isPrimary: true,
        },
      ]);
      await db.insert(schema.walletAddresses).values(wallets);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "monthly");

      const filePath = join(testOutputDir, "api", "leaderboard-monthly.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.leaderboard[0].wallets).toBeDefined();
      expect(content.leaderboard[0].wallets.ethereum).toBe("0x123...");
      expect(content.leaderboard[0].wallets.solana).toBe("abc123...");
    });

    it("should return empty wallets object when no wallets are linked", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "monthly");

      const filePath = join(testOutputDir, "api", "leaderboard-monthly.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.leaderboard[0].wallets).toEqual({});
    });

    it("should exclude bot users from leaderboard", async () => {
      const users = generateMockUsers([
        { username: "user1", isBot: 0 },
        { username: "bot-user", isBot: 1 },
      ]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const scores = generateMockUserDailyScores(
        [
          { username: "user1", score: 100 },
          { username: "bot-user", score: 200 },
        ],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "monthly");

      const filePath = join(testOutputDir, "api", "leaderboard-monthly.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.totalUsers).toBe(1);
      expect(content.leaderboard[0].username).toBe("user1");
    });

    it("should respect limit parameter", async () => {
      const users = generateMockUsers([
        { username: "user1", isBot: 0 },
        { username: "user2", isBot: 0 },
        { username: "user3", isBot: 0 },
      ]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const scores = generateMockUserDailyScores(
        [
          { username: "user1", score: 100 },
          { username: "user2", score: 80 },
          { username: "user3", score: 60 },
        ],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "monthly", { limit: 2 });

      const filePath = join(testOutputDir, "api", "leaderboard-monthly.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.totalUsers).toBe(2);
      expect(content.leaderboard).toHaveLength(2);
    });
  });

  describe("exportLeaderboardAPI - weekly", () => {
    it("should export weekly leaderboard starting from Sunday", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const day = today.getDay();
      const startOfWeek = new UTCDate(today);
      startOfWeek.setDate(today.getDate() - day);

      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        toDateString(startOfWeek),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "weekly");

      const filePath = join(testOutputDir, "api", "leaderboard-weekly.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.period).toBe("weekly");
      expect(content.startDate).toBe(toDateString(startOfWeek));
      expect(content.leaderboard[0].username).toBe("user1");
    });
  });

  describe("exportLeaderboardAPI - lifetime", () => {
    it("should export lifetime leaderboard from 2024-10-15", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        "2024-10-16",
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportLeaderboardAPI(testOutputDir, "lifetime");

      const filePath = join(testOutputDir, "api", "leaderboard-lifetime.json");
      const content = JSON.parse(readFileSync(filePath, "utf-8"));

      expect(content.period).toBe("lifetime");
      expect(content.startDate).toBe("2024-10-15");
      expect(content.leaderboard[0].username).toBe("user1");
    });
  });

  describe("exportAllLeaderboardAPIs", () => {
    it("should export all three leaderboard files", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        toDateString(startOfMonth),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportAllLeaderboardAPIs(testOutputDir);

      // Verify all three files exist
      expect(
        existsSync(join(testOutputDir, "api", "leaderboard-monthly.json")),
      ).toBe(true);
      expect(
        existsSync(join(testOutputDir, "api", "leaderboard-weekly.json")),
      ).toBe(true);
      expect(
        existsSync(join(testOutputDir, "api", "leaderboard-lifetime.json")),
      ).toBe(true);
    });
  });

  describe("Date range calculations", () => {
    it("should have correct date ranges for each period", async () => {
      const users = generateMockUsers([{ username: "user1", isBot: 0 }]);
      await db.insert(schema.users).values(users);

      const today = new UTCDate();
      const scores = generateMockUserDailyScores(
        [{ username: "user1", score: 100 }],
        toDateString(today),
      );
      await db.insert(schema.userDailyScores).values(scores);

      await exportAllLeaderboardAPIs(testOutputDir);

      // Check monthly
      const monthly = JSON.parse(
        readFileSync(
          join(testOutputDir, "api", "leaderboard-monthly.json"),
          "utf-8",
        ),
      );
      const startOfMonth = new UTCDate(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      expect(monthly.startDate).toBe(toDateString(startOfMonth));
      expect(monthly.endDate).toBe(toDateString(today));

      // Check weekly
      const weekly = JSON.parse(
        readFileSync(
          join(testOutputDir, "api", "leaderboard-weekly.json"),
          "utf-8",
        ),
      );
      const day = today.getDay();
      const startOfWeek = new UTCDate(today);
      startOfWeek.setDate(today.getDate() - day);
      expect(weekly.startDate).toBe(toDateString(startOfWeek));
      expect(weekly.endDate).toBe(toDateString(today));

      // Check lifetime
      const lifetime = JSON.parse(
        readFileSync(
          join(testOutputDir, "api", "leaderboard-lifetime.json"),
          "utf-8",
        ),
      );
      expect(lifetime.startDate).toBe("2024-10-15");
      expect(lifetime.endDate).toBe(toDateString(today));
    });
  });
});
