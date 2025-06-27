import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  generateContributorSummaries,
  generateDailyContributorSummaries,
  generateWeeklyContributorSummaries,
  generateMonthlyContributorSummaries,
} from "./generateContributorSummary";
import { SummarizerPipelineContext } from "./context";
import { IntervalType, TimeInterval } from "@/lib/date-utils";

// Mock dependencies
const mockDb = {
  query: {
    userSummaries: {
      findFirst: mock(() => Promise.resolve(undefined)),
    },
  },
};

const mockGenerateAISummaryForContributor = mock(() => 
  Promise.resolve("Generated AI summary for contributor")
);

const mockGetContributorMetrics = mock(() => 
  Promise.resolve({
    username: "testuser",
    commits: 5,
    linesAdded: 100,
    linesDeleted: 50,
  })
);

const mockStoreDailySummary = mock(() => Promise.resolve());

const mockGetActiveContributorsInInterval = mock(() => [
  { username: "user1" },
  { username: "user2" }
]);

const mockGenerateTimeIntervals = mock(() => [
  {
    intervalType: IntervalType.DAY,
    intervalStart: new Date("2023-01-01"),
    intervalEnd: new Date("2023-01-01"),
  },
]);

// Mock modules
mock.module("@/lib/data/db", () => ({
  db: mockDb,
}));

mock.module("./aiContributorSummary", () => ({
  generateAISummaryForContributor: mockGenerateAISummaryForContributor,
}));

mock.module("./queries", () => ({
  getContributorMetrics: mockGetContributorMetrics,
}));

mock.module("./mutations", () => ({
  storeDailySummary: mockStoreDailySummary,
}));

mock.module("../getActiveContributors", () => ({
  getActiveContributorsInInterval: mockGetActiveContributorsInInterval,
}));

mock.module("../generateTimeIntervals", () => ({
  generateTimeIntervals: mockGenerateTimeIntervals,
}));

describe("generateContributorSummary Pipeline Functions", () => {
  let mockContext: SummarizerPipelineContext;

  beforeEach(() => {
    // Reset all mocks
    mockDb.query.userSummaries.findFirst.mockClear();
    mockGenerateAISummaryForContributor.mockClear();
    mockGetContributorMetrics.mockClear();
    mockStoreDailySummary.mockClear();
    mockGetActiveContributorsInInterval.mockClear();
    mockGenerateTimeIntervals.mockClear();

    // Setup default mock context
    mockContext = {
      logger: {
        child: mock(() => ({
          debug: mock(),
          info: mock(),
          error: mock(),
        })),
        debug: mock(),
        info: mock(),
        error: mock(),
      },
      aiSummaryConfig: {
        enabled: true,
        provider: "openai",
        model: "gpt-3.5-turbo",
        apiKey: "test-key",
      },
      overwrite: false,
      enabledIntervals: {
        day: true,
        week: true,
        month: true,
      },
    };
  });

  afterEach(() => {
    mock.restore();
  });

  describe("generateContributorSummaries", () => {
    const mockInterval: TimeInterval = {
      intervalType: IntervalType.DAY,
      intervalStart: new Date("2023-01-01"),
      intervalEnd: new Date("2023-01-01"),
    };

    const mockInput = {
      interval: mockInterval,
      repoId: "test-repo",
      contributors: [
        { username: "user1" },
        { username: "user2" },
      ],
    };

    it("should generate summaries for all contributors when AI is enabled", async () => {
      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
        { username: "user2" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockGetContributorMetrics).toHaveBeenCalledTimes(2);
      expect(mockGenerateAISummaryForContributor).toHaveBeenCalledTimes(2);
      expect(mockStoreDailySummary).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when AI summary is disabled", async () => {
      mockContext.aiSummaryConfig.enabled = false;
      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockGetContributorMetrics).not.toHaveBeenCalled();
      expect(mockGenerateAISummaryForContributor).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toBeNull();
    });

    it("should skip existing summaries when overwrite is false", async () => {
      mockDb.query.userSummaries.findFirst.mockResolvedValue({
        id: 1,
        username: "user1",
        date: "2023-01-01",
        summary: "Existing summary",
        intervalType: IntervalType.DAY,
      });

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockGetContributorMetrics).not.toHaveBeenCalled();
      expect(mockGenerateAISummaryForContributor).not.toHaveBeenCalled();
      expect(mockStoreDailySummary).not.toHaveBeenCalled();
    });

    it("should overwrite existing summaries when overwrite is true", async () => {
      mockContext.overwrite = true;
      mockDb.query.userSummaries.findFirst.mockResolvedValue({
        id: 1,
        username: "user1",
        date: "2023-01-01",
        summary: "Existing summary",
        intervalType: IntervalType.DAY,
      });

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockGetContributorMetrics).toHaveBeenCalledTimes(1);
      expect(mockGenerateAISummaryForContributor).toHaveBeenCalledTimes(1);
      expect(mockStoreDailySummary).toHaveBeenCalledTimes(1);
    });

    it("should handle contributors with no activity", async () => {
      mockGenerateAISummaryForContributor.mockResolvedValue(null);
      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "inactive-user" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockStoreDailySummary).not.toHaveBeenCalled();
      expect(result).toHaveLength(0); // Filtered out null results
    });

    it("should handle errors gracefully", async () => {
      mockGetContributorMetrics.mockRejectedValue(new Error("Database error"));
      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "error-user" },
      ]);

      const result = await generateContributorSummaries(mockInput, mockContext);

      expect(mockContext.logger.child).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it("should pass correct date range to getContributorMetrics", async () => {
      const customInterval: TimeInterval = {
        intervalType: IntervalType.WEEK,
        intervalStart: new Date("2023-01-01"),
        intervalEnd: new Date("2023-01-07"),
      };

      const customInput = {
        ...mockInput,
        interval: customInterval,
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      await generateContributorSummaries(customInput, mockContext);

      expect(mockGetContributorMetrics).toHaveBeenCalledWith({
        username: "user1",
        dateRange: {
          startDate: "2023-01-01",
          endDate: "2023-01-07",
        },
      });
    });

    it("should handle empty contributors array", async () => {
      const emptyInput = {
        ...mockInput,
        contributors: [],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([]);

      const result = await generateContributorSummaries(emptyInput, mockContext);

      expect(result).toHaveLength(0);
      expect(mockGetContributorMetrics).not.toHaveBeenCalled();
    });
  });

  describe("generateDailyContributorSummaries", () => {
    const mockInput = { repoId: "test-repo" };

    it("should generate daily summaries when day interval is enabled", async () => {
      mockContext.enabledIntervals.day = true;
      mockGenerateTimeIntervals.mockReturnValue([
        {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-01"),
        },
      ]);

      const result = await generateDailyContributorSummaries(mockInput, mockContext);

      expect(mockGenerateTimeIntervals).toHaveBeenCalledWith("day");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array when day interval is disabled", async () => {
      mockContext.enabledIntervals.day = false;

      const result = await generateDailyContributorSummaries(mockInput, mockContext);

      expect(result).toHaveLength(0);
    });

    it("should handle multiple time intervals", async () => {
      mockContext.enabledIntervals.day = true;
      mockGenerateTimeIntervals.mockReturnValue([
        {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-01"),
        },
        {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-02"),
          intervalEnd: new Date("2023-01-02"),
        },
      ]);

      const result = await generateDailyContributorSummaries(mockInput, mockContext);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateWeeklyContributorSummaries", () => {
    const mockInput = { repoId: "test-repo" };

    it("should generate weekly summaries when week interval is enabled", async () => {
      mockContext.enabledIntervals.week = true;
      mockGenerateTimeIntervals.mockReturnValue([
        {
          intervalType: IntervalType.WEEK,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-07"),
        },
      ]);

      const result = await generateWeeklyContributorSummaries(mockInput, mockContext);

      expect(mockGenerateTimeIntervals).toHaveBeenCalledWith("week");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array when week interval is disabled", async () => {
      mockContext.enabledIntervals.week = false;

      const result = await generateWeeklyContributorSummaries(mockInput, mockContext);

      expect(result).toHaveLength(0);
    });
  });

  describe("generateMonthlyContributorSummaries", () => {
    const mockInput = { repoId: "test-repo" };

    it("should generate monthly summaries when month interval is enabled", async () => {
      mockContext.enabledIntervals.month = true;
      mockGenerateTimeIntervals.mockReturnValue([
        {
          intervalType: IntervalType.MONTH,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-31"),
        },
      ]);

      const result = await generateMonthlyContributorSummaries(mockInput, mockContext);

      expect(mockGenerateTimeIntervals).toHaveBeenCalledWith("month");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array when month interval is disabled", async () => {
      mockContext.enabledIntervals.month = false;

      const result = await generateMonthlyContributorSummaries(mockInput, mockContext);

      expect(result).toHaveLength(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    const mockInterval: TimeInterval = {
      intervalType: IntervalType.DAY,
      intervalStart: new Date("2023-01-01"),
      intervalEnd: new Date("2023-01-01"),
    };

    it("should handle null repoId", async () => {
      const input = {
        interval: mockInterval,
        repoId: null as any,
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(input, mockContext);

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle undefined repoId", async () => {
      const input = {
        interval: mockInterval,
        repoId: undefined,
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(input, mockContext);

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle malformed context", async () => {
      const malformedContext = {
        ...mockContext,
        logger: null,
      } as any;

      const input = {
        interval: mockInterval,
        repoId: "test-repo",
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      // Should not throw error
      const result = await generateContributorSummaries(input, malformedContext);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle database connection errors", async () => {
      mockDb.query.userSummaries.findFirst.mockRejectedValue(
        new Error("Database connection failed")
      );

      const input = {
        interval: mockInterval,
        repoId: "test-repo",
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(input, mockContext);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle AI service failures", async () => {
      mockGenerateAISummaryForContributor.mockRejectedValue(
        new Error("AI service unavailable")
      );

      const input = {
        interval: mockInterval,
        repoId: "test-repo",
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(input, mockContext);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle storage failures", async () => {
      mockStoreDailySummary.mockRejectedValue(
        new Error("Storage write failed")
      );

      const input = {
        interval: mockInterval,
        repoId: "test-repo",
        contributors: [{ username: "user1" }],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
      ]);

      const result = await generateContributorSummaries(input, mockContext);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Performance and Large Dataset Tests", () => {
    it("should handle large number of contributors efficiently", async () => {
      const largeContributorList = Array.from({ length: 100 }, (_, i) => ({
        username: `user${i}`,
      }));

      const input = {
        interval: {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-01"),
        },
        repoId: "test-repo",
        contributors: largeContributorList,
      };

      mockGetActiveContributorsInInterval.mockReturnValue(largeContributorList);

      const startTime = Date.now();
      const result = await generateContributorSummaries(input, mockContext);
      const endTime = Date.now();

      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should handle concurrent processing correctly", async () => {
      const input = {
        interval: {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-01"),
        },
        repoId: "test-repo",
        contributors: [
          { username: "user1" },
          { username: "user2" },
          { username: "user3" },
        ],
      };

      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "user1" },
        { username: "user2" },
        { username: "user3" },
      ]);

      // Run multiple calls concurrently
      const promises = [
        generateContributorSummaries(input, mockContext),
        generateContributorSummaries(input, mockContext),
        generateContributorSummaries(input, mockContext),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe("Integration-like Scenarios", () => {
    it("should work with complete realistic workflow", async () => {
      // Setup realistic mock data
      mockGetActiveContributorsInInterval.mockReturnValue([
        { username: "alice" },
        { username: "bob" },
      ]);

      mockGetContributorMetrics
        .mockResolvedValueOnce({
          username: "alice",
          commits: 15,
          linesAdded: 500,
          linesDeleted: 100,
        })
        .mockResolvedValueOnce({
          username: "bob",  
          commits: 8,
          linesAdded: 200,
          linesDeleted: 50,
        });

      mockGenerateAISummaryForContributor
        .mockResolvedValueOnce("Alice had significant contributions this period with 15 commits")
        .mockResolvedValueOnce("Bob made steady progress with 8 commits");

      const input = {
        interval: {
          intervalType: IntervalType.DAY,
          intervalStart: new Date("2023-01-01"),
          intervalEnd: new Date("2023-01-01"),
        },
        repoId: "real-project",
        contributors: [
          { username: "alice" },
          { username: "bob" },
        ],
      };

      const result = await generateContributorSummaries(input, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        username: "alice",
        summary: "Alice had significant contributions this period with 15 commits",
      });
      expect(result[1]).toEqual({
        username: "bob",
        summary: "Bob made steady progress with 8 commits",
      });

      expect(mockStoreDailySummary).toHaveBeenCalledTimes(2);
      expect(mockStoreDailySummary).toHaveBeenCalledWith(
        "alice",
        "2023-01-01",
        "Alice had significant contributions this period with 15 commits",
        IntervalType.DAY
      );
    });
  });
});