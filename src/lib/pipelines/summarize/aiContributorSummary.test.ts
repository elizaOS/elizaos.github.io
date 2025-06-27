import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { aiContributorSummary, generateContributorSummary, summarizeContribution, ContributorData } from "./aiContributorSummary";

// Mock external dependencies
const mockLogger = {
  info: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {})
};

const mockAIService = {
  callAI: mock(() => Promise.resolve("Mock AI response"))
};

// Mock modules
mock.module("../../../utils/logger", () => ({
  logger: mockLogger
}));

mock.module("../../../services/aiService", () => mockAIService);

describe("aiContributorSummary", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
    mockAIService.callAI.mockClear();
    mockAIService.callAI.mockResolvedValue("Default mock response");
  });

  afterEach(() => {
    // Clean up after each test if needed
  });

  describe("aiContributorSummary main function", () => {
    it("should handle empty contributor array", async () => {
      const result = await aiContributorSummary([]);
      expect(result).toEqual([]);
      expect(mockAIService.callAI).not.toHaveBeenCalled();
    });

    it("should handle null input gracefully", async () => {
      const result = await aiContributorSummary(null as any);
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith("No contributor data provided");
    });

    it("should handle undefined input gracefully", async () => {
      const result = await aiContributorSummary(undefined as any);
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith("No contributor data provided");
    });

    it("should process single contributor successfully", async () => {
      const mockContributor: ContributorData = {
        name: "John Doe",
        email: "john@example.com",
        commits: 5,
        additions: 100,
        deletions: 50,
        contributions: ["Added new feature", "Fixed bug in login"],
        filesChanged: ["src/auth.ts", "src/login.ts"]
      };

      const mockSummary = "John Doe made significant contributions with 5 commits";
      mockAIService.callAI.mockResolvedValue(mockSummary);

      const result = await aiContributorSummary([mockContributor]);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockSummary);
      expect(mockAIService.callAI).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Processing 1 contributors for AI summary");
    });

    it("should process multiple contributors successfully", async () => {
      const mockContributors: ContributorData[] = [
        {
          name: "John Doe",
          email: "john@example.com",
          commits: 5,
          additions: 100,
          deletions: 50,
          contributions: ["Added new feature"],
          filesChanged: ["src/feature.ts"]
        },
        {
          name: "Jane Smith", 
          email: "jane@example.com",
          commits: 3,
          additions: 75,
          deletions: 25,
          contributions: ["Fixed critical bug"],
          filesChanged: ["src/bugfix.ts"]
        }
      ];

      mockAIService.callAI
        .mockResolvedValueOnce("John Doe summary")
        .mockResolvedValueOnce("Jane Smith summary");

      const result = await aiContributorSummary(mockContributors);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("John Doe summary");
      expect(result[1]).toBe("Jane Smith summary");
      expect(mockAIService.callAI).toHaveBeenCalledTimes(2);
    });

    it("should handle AI service failures gracefully", async () => {
      const mockContributor: ContributorData = {
        name: "John Doe",
        email: "john@example.com", 
        commits: 5,
        additions: 100,
        deletions: 50,
        contributions: ["Added new feature"],
        filesChanged: ["src/feature.ts"]
      };

      const aiError = new Error("AI service unavailable");
      mockAIService.callAI.mockRejectedValue(aiError);

      const result = await aiContributorSummary([mockContributor]);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toContain("Error generating summary for John Doe");
      expect(mockLogger.error).toHaveBeenCalledWith("Failed to generate AI summary for contributor John Doe:", aiError);
    });

    it("should handle partial AI service failures", async () => {
      const mockContributors: ContributorData[] = [
        {
          name: "John Doe",
          email: "john@example.com",
          commits: 5,
          additions: 100,
          deletions: 50,
          contributions: ["Feature A"],
          filesChanged: ["src/a.ts"]
        },
        {
          name: "Jane Smith",
          email: "jane@example.com", 
          commits: 3,
          additions: 75,
          deletions: 25,
          contributions: ["Feature B"],
          filesChanged: ["src/b.ts"]
        }
      ];

      mockAIService.callAI
        .mockResolvedValueOnce("John Doe summary") 
        .mockRejectedValueOnce(new Error("AI service error"));

      const result = await aiContributorSummary(mockContributors);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("John Doe summary");
      expect(result[1]).toContain("Error generating summary for Jane Smith");
    });

    it("should handle concurrent processing with rate limiting", async () => {
      const contributors = Array.from({ length: 10 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        commits: i + 1,
        additions: (i + 1) * 10,
        deletions: (i + 1) * 5,
        contributions: [`Contribution ${i}`],
        filesChanged: [`src/file${i}.ts`]
      }));

      mockAIService.callAI.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        return "Summary generated";
      });

      const result = await aiContributorSummary(contributors);
      
      expect(result).toHaveLength(10);
      expect(result.every(r => r === "Summary generated")).toBe(true);
      expect(mockAIService.callAI).toHaveBeenCalledTimes(10);
    });
  });

  describe("generateContributorSummary", () => {
    it("should generate summary for contributor with complete data", async () => {
      const contributor: ContributorData = {
        name: "Alice Johnson",
        email: "alice@example.com",
        commits: 10,
        additions: 200,
        deletions: 100,
        contributions: ["Implemented user authentication", "Added unit tests"],
        filesChanged: ["src/auth.ts", "test/auth.test.ts"]
      };

      const mockSummary = "Alice Johnson contributed 10 commits with authentication features";
      mockAIService.callAI.mockResolvedValue(mockSummary);

      const result = await generateContributorSummary(contributor);
      
      expect(result).toBe(mockSummary);
      expect(mockAIService.callAI).toHaveBeenCalledWith(
        expect.stringContaining("Alice Johnson"),
        expect.objectContaining({
          model: "gpt-4",
          temperature: 0.3,
          maxTokens: 150
        })
      );
    });

    it("should handle contributor with minimal activity", async () => {
      const contributor: ContributorData = {
        name: "Bob Wilson",
        email: "bob@example.com",
        commits: 1,
        additions: 5,
        deletions: 2,
        contributions: ["Minor typo fix"],
        filesChanged: ["README.md"]
      };

      const result = await generateContributorSummary(contributor);
      
      expect(mockAIService.callAI).toHaveBeenCalledWith(
        expect.stringContaining("Bob Wilson"),
        expect.any(Object)
      );
    });

    it("should handle contributor with no contributions", async () => {
      const contributor: ContributorData = {
        name: "Charlie Brown",
        email: "charlie@example.com",
        commits: 0,
        additions: 0,
        deletions: 0,
        contributions: [],
        filesChanged: []
      };

      const result = await generateContributorSummary(contributor);
      
      expect(result).toContain("No significant contributions recorded");
      expect(mockAIService.callAI).not.toHaveBeenCalled();
    });

    it("should handle missing email field", async () => {
      const contributor: ContributorData = {
        name: "David Lee",
        email: "",
        commits: 5,
        additions: 50,
        deletions: 25,
        contributions: ["Minor fixes"],
        filesChanged: ["src/utils.ts"]
      };

      const mockSummary = "David Lee made minor contributions";
      mockAIService.callAI.mockResolvedValue(mockSummary);

      const result = await generateContributorSummary(contributor);
      
      expect(result).toBe(mockSummary);
      expect(mockAIService.callAI).toHaveBeenCalledWith(
        expect.stringContaining("David Lee"),
        expect.any(Object)
      );
    });

    it("should handle AI service timeout", async () => {
      const contributor: ContributorData = {
        name: "Eve Martinez",
        email: "eve@example.com",
        commits: 5,
        additions: 100,
        deletions: 50,
        contributions: ["Feature work"],
        filesChanged: ["src/feature.ts"]
      };

      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      mockAIService.callAI.mockRejectedValue(timeoutError);

      const result = await generateContributorSummary(contributor);
      
      expect(result).toContain("Error generating summary for Eve Martinez");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to generate AI summary for contributor Eve Martinez:",
        timeoutError
      );
    });

    it("should handle very large contribution data", async () => {
      const largeContributions = Array.from({ length: 100 }, (_, i) => `Contribution ${i + 1}`);
      const largeFiles = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`);
      
      const contributor: ContributorData = {
        name: "Frank Wilson",
        email: "frank@example.com",
        commits: 500,
        additions: 10000,
        deletions: 5000,
        contributions: largeContributions,
        filesChanged: largeFiles
      };

      const mockSummary = "Frank Wilson made extensive contributions";
      mockAIService.callAI.mockResolvedValue(mockSummary);

      const result = await generateContributorSummary(contributor);
      
      expect(result).toBe(mockSummary);
      // Should truncate large data in AI call
      expect(mockAIService.callAI).toHaveBeenCalledWith(
        expect.stringMatching(/Frank Wilson[\s\S]*\.\.\./),
        expect.any(Object)
      );
    });
  });

  describe("summarizeContribution", () => {
    it("should create proper summary prompt for typical contributor", () => {
      const contribution: ContributorData = {
        name: "Grace Chen",
        email: "grace@example.com",
        commits: 8,
        additions: 150,
        deletions: 75,
        contributions: ["Added API endpoints", "Improved error handling"],
        filesChanged: ["src/api.ts", "src/errors.ts"]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Grace Chen");
      expect(result).toContain("8 commits");
      expect(result).toContain("150 additions");
      expect(result).toContain("75 deletions");
      expect(result).toContain("Added API endpoints");
      expect(result).toContain("Improved error handling");
      expect(result).toContain("src/api.ts");
      expect(result).toContain("src/errors.ts");
    });

    it("should handle contributor with zero stats", () => {
      const contribution: ContributorData = {
        name: "Henry Adams",
        email: "henry@example.com",
        commits: 0,
        additions: 0,
        deletions: 0,
        contributions: [],
        filesChanged: []
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Henry Adams");
      expect(result).toContain("0 commits");
      expect(result).toContain("No contributions recorded");
    });

    it("should handle contributor with negative stats gracefully", () => {
      const contribution: ContributorData = {
        name: "Ivan Petrov",
        email: "ivan@example.com", 
        commits: -1,
        additions: -50,
        deletions: -25,
        contributions: ["Data inconsistency"],
        filesChanged: ["src/invalid.ts"]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Ivan Petrov");
      expect(result).toContain("Data inconsistency detected");
    });

    it("should handle contributor with missing name", () => {
      const contribution: ContributorData = {
        name: "",
        email: "anonymous@example.com",
        commits: 3,
        additions: 30,
        deletions: 15,
        contributions: ["Anonymous contribution"],
        filesChanged: ["src/anon.ts"]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("anonymous@example.com");
      expect(result).toContain("Anonymous contribution");
    });

    it("should handle special characters in name and contributions", () => {
      const contribution: ContributorData = {
        name: "José María García-López",
        email: "jose@example.com",
        commits: 5,
        additions: 100,
        deletions: 50,
        contributions: ["Añadió funcionalidad de internacionalización", "Corrigió errores de codificación UTF-8"],
        filesChanged: ["src/i18n.ts", "src/encoding.ts"]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("José María García-López");
      expect(result).toContain("internacionalización");
      expect(result).toContain("UTF-8");
    });

    it("should truncate very long contribution descriptions", () => {
      const longDescription = "A".repeat(2000);
      const contribution: ContributorData = {
        name: "Julia Roberts",
        email: "julia@example.com",
        commits: 2,
        additions: 20,
        deletions: 10,
        contributions: [longDescription, "Short contribution"],
        filesChanged: ["src/long.ts"]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Julia Roberts");
      expect(result).toContain("Short contribution");
      expect(result.length).toBeLessThan(2500); // Should be truncated
      expect(result).toContain("..."); // Truncation indicator
    });

    it("should handle null/undefined values in contributions array", () => {
      const contribution: ContributorData = {
        name: "Kevin Brown",
        email: "kevin@example.com",
        commits: 4,
        additions: 40,
        deletions: 20,
        contributions: ["Valid contribution", undefined, null, "Another valid one"] as any,
        filesChanged: ["src/valid.ts", undefined, null, "src/another.ts"] as any
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Kevin Brown");
      expect(result).toContain("Valid contribution");
      expect(result).toContain("Another valid one");
      expect(result).toContain("src/valid.ts");
      expect(result).toContain("src/another.ts");
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("null");
    });

    it("should format file paths clearly", () => {
      const contribution: ContributorData = {
        name: "Laura Wilson",
        email: "laura@example.com",
        commits: 6,
        additions: 120,
        deletions: 60,
        contributions: ["Refactored components"],
        filesChanged: [
          "src/components/Header.tsx",
          "src/components/Footer.tsx", 
          "src/utils/helpers.ts",
          "tests/components/Header.test.tsx"
        ]
      };

      const result = summarizeContribution(contribution);
      
      expect(result).toContain("Laura Wilson");
      expect(result).toContain("Header.tsx");
      expect(result).toContain("Footer.tsx");
      expect(result).toContain("helpers.ts");
      expect(result).toContain("Header.test.tsx");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle malformed contributor objects", async () => {
      const malformedContributors = [
        { name: "Incomplete" }, // Missing required fields
        null,
        undefined,
        { 
          name: "Valid User",
          email: "test@example.com", 
          commits: 1,
          additions: 10,
          deletions: 5,
          contributions: [],
          filesChanged: []
        }
      ] as any;

      const result = await aiContributorSummary(malformedContributors);
      
      expect(result).toHaveLength(4);
      expect(result.filter(r => r.includes("Error") || r.includes("Invalid"))).toHaveLength(3);
      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });

    it("should handle memory constraints with large datasets", async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        name: `LargeUser ${i}`,
        email: `large${i}@example.com`,
        commits: 1,
        additions: 10,
        deletions: 5,
        contributions: [`Large contribution ${i}`],
        filesChanged: [`src/large${i}.ts`]
      }));

      mockAIService.callAI.mockResolvedValue("Batch summary");

      const result = await aiContributorSummary(largeDataset);
      
      expect(result).toHaveLength(100);
      expect(mockLogger.info).toHaveBeenCalledWith("Processing 100 contributors for AI summary");
    });

    it("should handle API rate limiting gracefully", async () => {
      const contributors = Array.from({ length: 5 }, (_, i) => ({
        name: `RateUser ${i}`,
        email: `rate${i}@example.com`,
        commits: 1,
        additions: 10,
        deletions: 5, 
        contributions: [`Rate test ${i}`],
        filesChanged: [`src/rate${i}.ts`]
      }));

      const rateLimitError = new Error("Rate limit exceeded");
      rateLimitError.name = "RateLimitError";
      
      mockAIService.callAI
        .mockResolvedValueOnce("Success 1")
        .mockResolvedValueOnce("Success 2")
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce("Success 4")
        .mockResolvedValueOnce("Success 5");

      const result = await aiContributorSummary(contributors);
      
      expect(result).toHaveLength(5);
      expect(result[2]).toContain("Error generating summary");
      expect(mockLogger.warn).toHaveBeenCalledWith("Rate limit encountered, implementing backoff strategy");
    });
  });

  describe("Integration and performance tests", () => {
    it("should maintain data integrity through full pipeline", async () => {
      const originalContributor: ContributorData = {
        name: "Integration Test User",
        email: "integration@example.com",
        commits: 15,
        additions: 300,
        deletions: 150,
        contributions: [
          "Implemented core feature",
          "Added comprehensive tests", 
          "Updated documentation",
          "Fixed performance issues"
        ],
        filesChanged: [
          "src/core.ts",
          "test/core.test.ts",
          "docs/README.md",
          "src/performance.ts"
        ]
      };

      const expectedSummary = `Integration Test User contributed significantly with ${originalContributor.commits} commits`;
      mockAIService.callAI.mockResolvedValue(expectedSummary);

      const result = await aiContributorSummary([originalContributor]);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(expectedSummary);
      expect(mockAIService.callAI).toHaveBeenCalledWith(
        expect.stringContaining(originalContributor.name),
        expect.objectContaining({
          model: "gpt-4",
          temperature: 0.3
        })
      );
    });

    it("should handle mixed success/failure scenarios gracefully", async () => {
      const contributors: ContributorData[] = [
        {
          name: "Success User 1",
          email: "success1@example.com",
          commits: 5,
          additions: 50,
          deletions: 25,
          contributions: ["Work 1"],
          filesChanged: ["src/work1.ts"]
        },
        {
          name: "Failure User",
          email: "failure@example.com", 
          commits: 3,
          additions: 30,
          deletions: 15,
          contributions: ["Work 2"],
          filesChanged: ["src/work2.ts"]
        },
        {
          name: "Success User 2",
          email: "success2@example.com",
          commits: 7,
          additions: 70,
          deletions: 35,
          contributions: ["Work 3"],
          filesChanged: ["src/work3.ts"]
        }
      ];

      mockAIService.callAI
        .mockResolvedValueOnce("Success summary 1")
        .mockRejectedValueOnce(new Error("AI failure"))
        .mockResolvedValueOnce("Success summary 2");

      const result = await aiContributorSummary(contributors);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe("Success summary 1");
      expect(result[1]).toContain("Error generating summary");
      expect(result[2]).toBe("Success summary 2");
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("should have reasonable performance for typical datasets", async () => {
      const contributors = Array.from({ length: 20 }, (_, i) => ({
        name: `PerfUser ${i}`,
        email: `perf${i}@example.com`,
        commits: Math.floor(Math.random() * 20) + 1,
        additions: Math.floor(Math.random() * 200) + 10,
        deletions: Math.floor(Math.random() * 100) + 5,
        contributions: [`Performance test contribution ${i}`],
        filesChanged: [`src/perf${i}.ts`]
      }));

      mockAIService.callAI.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms AI call
        return "Performance summary";
      });

      const startTime = Date.now();
      const result = await aiContributorSummary(contributors);
      const endTime = Date.now();
      
      expect(result).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockAIService.callAI).toHaveBeenCalledTimes(20);
    });
  });
});