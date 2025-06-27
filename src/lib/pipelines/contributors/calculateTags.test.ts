import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { calculateTags } from "./calculateTags";

// Mock data interfaces for testing
interface ContributorData {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  commitMessages?: string[];
  fileTypes?: string[];
  timeSpan?: {
    start: Date;
    end: Date;
  };
  isActive?: boolean;
}

describe("calculateTags", () => {
  let mockContributor: ContributorData;

  beforeEach(() => {
    // Reset mock data before each test
    mockContributor = {
      name: "John Doe",
      email: "john@example.com",
      commits: 10,
      linesAdded: 100,
      linesDeleted: 50,
      filesChanged: 5,
      commitMessages: ["feat: add new feature", "fix: bug fix", "docs: update README"],
      fileTypes: [".ts", ".js", ".md"],
      timeSpan: {
        start: new Date("2023-01-01"),
        end: new Date("2023-12-31"),
      },
      isActive: true,
    };
  });

  afterEach(() => {
    // Clean up after each test if needed
  });

  describe("Happy Path Tests", () => {
    it("should calculate tags for a typical contributor", () => {
      const result = calculateTags(mockContributor);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return consistent results for same input", () => {
      const result1 = calculateTags(mockContributor);
      const result2 = calculateTags(mockContributor);
      
      expect(result1).toEqual(result2);
    });

    it("should handle contributor with minimal activity", () => {
      mockContributor.commits = 1;
      mockContributor.linesAdded = 5;
      mockContributor.linesDeleted = 2;
      mockContributor.filesChanged = 1;
      
      const result = calculateTags(mockContributor);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("newcomer");
    });

    it("should handle high-activity contributor", () => {
      mockContributor.commits = 500;
      mockContributor.linesAdded = 5000;
      mockContributor.linesDeleted = 2000;
      mockContributor.filesChanged = 200;
      
      const result = calculateTags(mockContributor);
      
      expect(result).toBeDefined();
      expect(result).toContain("prolific");
      expect(result).toContain("experienced");
    });

    it("should identify frontend contributors", () => {
      mockContributor.fileTypes = [".tsx", ".jsx", ".css", ".scss"];
      mockContributor.commitMessages = ["feat: add new UI component", "style: update button styles"];
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("frontend");
    });

    it("should identify backend contributors", () => {
      mockContributor.fileTypes = [".py", ".java", ".sql", ".go"];
      mockContributor.commitMessages = ["feat: add API endpoint", "fix: database connection"];
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("backend");
    });

    it("should identify documentation contributors", () => {
      mockContributor.fileTypes = [".md", ".rst", ".txt"];
      mockContributor.commitMessages = ["docs: update API documentation", "docs: add README"];
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("documentarian");
    });

    it("should identify bug fixers", () => {
      mockContributor.commitMessages = ["fix: critical bug", "hotfix: production issue", "bugfix: memory leak"];
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("bug-hunter");
    });

    it("should identify feature developers", () => {
      mockContributor.commitMessages = ["feat: new user dashboard", "feature: payment integration"];
      mockContributor.linesAdded = 1000;
      mockContributor.linesDeleted = 100;
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("feature-builder");
    });

    it("should identify refactoring specialists", () => {
      mockContributor.commitMessages = ["refactor: improve code structure", "refactor: optimize performance"];
      mockContributor.linesAdded = 200;
      mockContributor.linesDeleted = 800;
      
      const result = calculateTags(mockContributor);
      
      expect(result).toContain("refactorer");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined input gracefully", () => {
      expect(() => calculateTags(undefined as any)).not.toThrow();
      const result = calculateTags(undefined as any);
      expect(result).toEqual([]);
    });

    it("should handle null input gracefully", () => {
      expect(() => calculateTags(null as any)).not.toThrow();
      const result = calculateTags(null as any);
      expect(result).toEqual([]);
    });

    it("should handle empty contributor object", () => {
      const emptyContributor = {} as ContributorData;
      
      expect(() => calculateTags(emptyContributor)).not.toThrow();
      const result = calculateTags(emptyContributor);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle contributor with zero values", () => {
      mockContributor.commits = 0;
      mockContributor.linesAdded = 0;
      mockContributor.linesDeleted = 0;
      mockContributor.filesChanged = 0;
      
      const result = calculateTags(mockContributor);
      
      expect(result).toBeDefined();
      expect(result).toContain("inactive");
    });

    it("should handle negative values", () => {
      mockContributor.commits = -5;
      mockContributor.linesAdded = -100;
      mockContributor.linesDeleted = -50;
      mockContributor.filesChanged = -2;
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });

    it("should handle extremely large values", () => {
      mockContributor.commits = Number.MAX_SAFE_INTEGER;
      mockContributor.linesAdded = Number.MAX_SAFE_INTEGER;
      mockContributor.linesDeleted = Number.MAX_SAFE_INTEGER;
      mockContributor.filesChanged = Number.MAX_SAFE_INTEGER;
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });

    it("should handle floating point values", () => {
      mockContributor.commits = 10.5;
      mockContributor.linesAdded = 100.7;
      mockContributor.linesDeleted = 50.3;
      mockContributor.filesChanged = 5.9;
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });

    it("should handle missing optional fields", () => {
      const minimalContributor = {
        name: "Minimal User",
        email: "minimal@example.com",
        commits: 5,
        linesAdded: 50,
        linesDeleted: 25,
        filesChanged: 3,
      };
      
      expect(() => calculateTags(minimalContributor)).not.toThrow();
      const result = calculateTags(minimalContributor);
      expect(result).toBeDefined();
    });

    it("should handle empty arrays", () => {
      mockContributor.commitMessages = [];
      mockContributor.fileTypes = [];
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });

    it("should handle malformed dates", () => {
      mockContributor.timeSpan = {
        start: new Date("invalid-date"),
        end: new Date("another-invalid-date"),
      };
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      mockContributor.name = longString;
      mockContributor.email = longString + "@example.com";
      
      expect(() => calculateTags(mockContributor)).not.toThrow();
      const result = calculateTags(mockContributor);
      expect(result).toBeDefined();
    });
  });

  describe("Tag Logic Validation", () => {
    it("should not assign conflicting tags", () => {
      const result = calculateTags(mockContributor);
      
      // Check for logical conflicts
      const hasNewcomerAndExperienced = result.includes("newcomer") && result.includes("experienced");
      const hasInactiveAndProlific = result.includes("inactive") && result.includes("prolific");
      
      expect(hasNewcomerAndExperienced).toBe(false);
      expect(hasInactiveAndProlific).toBe(false);
    });

    it("should assign experience-based tags correctly", () => {
      // Test newcomer
      mockContributor.commits = 1;
      mockContributor.linesAdded = 10;
      let result = calculateTags(mockContributor);
      expect(result).toContain("newcomer");
      
      // Test experienced
      mockContributor.commits = 100;
      mockContributor.linesAdded = 1000;
      result = calculateTags(mockContributor);
      expect(result).toContain("experienced");
      
      // Test veteran
      mockContributor.commits = 1000;
      mockContributor.linesAdded = 10000;
      result = calculateTags(mockContributor);
      expect(result).toContain("veteran");
    });

    it("should calculate activity-based tags correctly", () => {
      // Test low activity
      mockContributor.commits = 2;
      let result = calculateTags(mockContributor);
      expect(result).toContain("casual");
      
      // Test high activity
      mockContributor.commits = 200;
      result = calculateTags(mockContributor);
      expect(result).toContain("prolific");
    });

    it("should identify specialists based on file types", () => {
      // Test database specialist
      mockContributor.fileTypes = [".sql", ".db", ".migration"];
      let result = calculateTags(mockContributor);
      expect(result).toContain("database");
      
      // Test devops specialist
      mockContributor.fileTypes = [".yml", ".yaml", ".dockerfile", ".sh"];
      result = calculateTags(mockContributor);
      expect(result).toContain("devops");
      
      // Test testing specialist
      mockContributor.fileTypes = [".test.ts", ".spec.js", ".test.py"];
      result = calculateTags(mockContributor);
      expect(result).toContain("tester");
    });

    it("should identify maintainers based on commit patterns", () => {
      mockContributor.commitMessages = [
        "chore: update dependencies",
        "maint: cleanup old code",
        "chore: update CI configuration"
      ];
      
      const result = calculateTags(mockContributor);
      expect(result).toContain("maintainer");
    });
  });

  describe("Performance Tests", () => {
    it("should complete calculation within reasonable time", () => {
      const startTime = performance.now();
      const result = calculateTags(mockContributor);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toBeDefined();
    });

    it("should handle large datasets efficiently", () => {
      mockContributor.commitMessages = Array(1000).fill("feat: large dataset test");
      mockContributor.fileTypes = Array(100).fill(".ts");
      
      const startTime = performance.now();
      const result = calculateTags(mockContributor);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should handle large data in under 500ms
      expect(result).toBeDefined();
    });

    it("should be memory efficient", () => {
      // Test with multiple large contributors
      const contributors = Array(100).fill(null).map((_, i) => ({
        ...mockContributor,
        name: `Contributor ${i}`,
        email: `contributor${i}@example.com`,
      }));
      
      expect(() => {
        contributors.forEach(contributor => calculateTags(contributor));
      }).not.toThrow();
    });
  });

  describe("Security Tests", () => {
    it("should handle malicious input safely", () => {
      const maliciousContributor = {
        name: "<script>alert('xss')</script>",
        email: "'; DROP TABLE users; --",
        commits: 10,
        linesAdded: 100,
        linesDeleted: 50,
        filesChanged: 5,
        commitMessages: ["<script>alert('xss')</script>"],
        fileTypes: ["'; DROP TABLE files; --"],
      };
      
      expect(() => calculateTags(maliciousContributor)).not.toThrow();
      const result = calculateTags(maliciousContributor);
      
      // Ensure output is safe
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain("<script>");
      expect(resultString).not.toContain("DROP TABLE");
    });

    it("should handle prototype pollution attempts", () => {
      const maliciousContributor = {
        name: "Malicious User",
        email: "malicious@example.com",
        commits: 10,
        linesAdded: 100,
        linesDeleted: 50,
        filesChanged: 5,
        "__proto__": { admin: true },
        "constructor": { prototype: { admin: true } },
      } as any;
      
      expect(() => calculateTags(maliciousContributor)).not.toThrow();
      const result = calculateTags(maliciousContributor);
      expect(result).toBeDefined();
    });
  });

  describe("Integration Scenarios", () => {
    it("should work with real-world contributor data patterns", () => {
      const realWorldContributor = {
        name: "Alice Johnson",
        email: "alice.johnson@company.com",
        commits: 127,
        linesAdded: 2847,
        linesDeleted: 1203,
        filesChanged: 89,
        commitMessages: [
          "feat: implement user authentication",
          "fix: resolve memory leak in cache",
          "docs: update API documentation",
          "refactor: improve database queries",
          "test: add unit tests for auth module",
          "chore: update dependencies",
        ],
        fileTypes: [".ts", ".tsx", ".test.ts", ".md", ".json", ".yml"],
        timeSpan: {
          start: new Date("2023-01-15"),
          end: new Date("2023-12-20"),
        },
        isActive: true,
      };
      
      const result = calculateTags(realWorldContributor);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("experienced");
      expect(result).toContain("full-stack");
    });

    it("should handle contributors with seasonal activity", () => {
      const seasonalContributor = {
        ...mockContributor,
        timeSpan: {
          start: new Date("2023-06-01"),
          end: new Date("2023-08-31"),
        },
        commits: 200, // High activity in short period
      };
      
      const result = calculateTags(seasonalContributor);
      
      expect(result).toBeDefined();
      expect(result).toContain("seasonal");
    });

    it("should handle contributors with diverse skill sets", () => {
      const diverseContributor = {
        ...mockContributor,
        fileTypes: [".ts", ".py", ".java", ".go", ".rs", ".cpp"],
        commitMessages: [
          "feat: add microservice in Go",
          "fix: resolve Python data processing issue",
          "refactor: optimize C++ algorithms",
          "docs: update Rust documentation",
        ],
      };
      
      const result = calculateTags(diverseContributor);
      
      expect(result).toBeDefined();
      expect(result).toContain("polyglot");
    });
  });

  describe("Regression Tests", () => {
    it("should maintain backward compatibility with legacy data", () => {
      const legacyContributor = {
        name: "Legacy User",
        email: "legacy@old-system.com",
        commits: 50,
        linesAdded: 500,
        linesDeleted: 200,
        filesChanged: 25,
        // Missing newer fields
        commitMessages: undefined,
        fileTypes: undefined,
        timeSpan: undefined,
        isActive: undefined,
      };
      
      expect(() => calculateTags(legacyContributor)).not.toThrow();
      const result = calculateTags(legacyContributor);
      expect(result).toBeDefined();
    });

    it("should handle version changes gracefully", () => {
      // Test with different data structure versions
      const v1Contributor = {
        name: "V1 User",
        email: "v1@example.com",
        commits: 10,
        additions: 100, // Old field name
        deletions: 50,  // Old field name
        files: 5,       // Old field name
      };
      
      expect(() => calculateTags(v1Contributor as any)).not.toThrow();
    });
  });
});