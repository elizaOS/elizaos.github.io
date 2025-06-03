import { formatProfileDataForCopy, FormatProfileOptions } from "../profile-formatter";
import { UserProfileData } from "../../app/profile/[username]/queries";
import { TagData } from "../../components/skill-card"; // Used for mock structure
import { Summary } from "../../components/summary-card"; // Used for mock structure

// Mock data as per instructions
const mockProfileData: UserProfileData = {
  username: "testuser",
  score: 1000, // This field is in UserProfileData
  monthlySummaries: [
    { date: "2023-01-01", summary: "Monthly summary 1" },
    { date: "2023-02-01", summary: "Monthly summary 2" },
  ],
  weeklySummaries: [
    { date: "2023-01-07", summary: "Weekly summary 1" },
    { date: "2023-01-14", summary: "Weekly summary 2" },
  ],
  roleTags: [{ tagName: "Role1", score: 100, level: 1, progress: 0, pointsToNext: 50, category: "role" }],
  skillTags: [{ tagName: "Skill1", score: 50, level: 2, progress: 0, pointsToNext: 25, category: "tech" }],
  focusAreaTags: [{ tagName: "Focus1", score: 75, level: 3, progress: 0, pointsToNext: 10, category: "area" }],
  stats: {
    totalPrs: 10,
    mergedPrs: 8,
    closedPrs: 1,
    additions: 500,
    deletions: 100,
    changedFiles: 50,
  },
  totalXp: 1200, // This field is in UserProfileData
  totalLevel: 5, // This field is in UserProfileData
  dailyActivity: [
    { date: "2023-01-01", count: 5, level: 0 }, // level is part of UserActivityHeatmap, ensure it's in mock
    { date: "2023-01-02", count: 0, level: 0 },
    { date: "2023-01-03", count: 3, level: 0 },
  ],
};

describe("formatProfileDataForCopy", () => {
  it("should include all sections when all options are true", () => {
    const options: FormatProfileOptions = {
      includeBasicInfo: true,
      includeMonthlySummaries: true,
      includeWeeklySummaries: true,
      includeContributionStats: true,
      includeRoles: true,
      includeFocusAreas: true,
      includeSkills: true,
      includeDailyActivitySummary: true,
    };
    const output = formatProfileDataForCopy(mockProfileData, options);
    expect(output).toContain("Username: testuser");
    expect(output).toContain("Level: 5");
    expect(output).toContain("XP: 1,200");
    expect(output).toContain("GitHub: https://github.com/testuser");
    expect(output).toContain("Monthly Summaries:");
    expect(output).toContain("- [2023-01-01]: Monthly summary 1");
    expect(output).toContain("Weekly Summaries:");
    expect(output).toContain("- [2023-01-07]: Weekly summary 1");
    expect(output).toContain("Contribution Stats:");
    expect(output).toContain("Pull Requests: Total - 10, Merged - 8, Closed - 1");
    expect(output).toContain("Roles:");
    expect(output).toContain("- Role1 (Score: 100, Level: 1)");
    expect(output).toContain("Focus Areas:");
    expect(output).toContain("- Focus1 (Score: 75, Level: 3)");
    expect(output).toContain("Skills:");
    expect(output).toContain("- Skill1 (Score: 50, Level: 2)");
    expect(output).toContain("Daily Activity Summary:");
    expect(output).toContain("Active on 2 of the last 3 days.");
    expect(output).toContain("Total contributions in this period: 8");
  });

  it("should return an empty string when all options are false", () => {
    const options: FormatProfileOptions = {
      includeBasicInfo: false,
      includeMonthlySummaries: false,
      includeWeeklySummaries: false,
      includeContributionStats: false,
      includeRoles: false,
      includeFocusAreas: false,
      includeSkills: false,
      includeDailyActivitySummary: false,
    };
    const output = formatProfileDataForCopy(mockProfileData, options);
    expect(output).toBe("");
  });

  it("should include only selected sections (Basic Info and Skills)", () => {
    const options: FormatProfileOptions = {
      includeBasicInfo: true,
      includeMonthlySummaries: false,
      includeWeeklySummaries: false,
      includeContributionStats: false,
      includeRoles: false,
      includeFocusAreas: false,
      includeSkills: true,
      includeDailyActivitySummary: false,
    };
    const output = formatProfileDataForCopy(mockProfileData, options);
    expect(output).toContain("Username: testuser");
    expect(output).toContain("Skills:");
    expect(output).toContain("- Skill1 (Score: 50, Level: 2)");
    expect(output).not.toContain("Monthly Summaries:");
    expect(output).not.toContain("Weekly Summaries:");
    expect(output).not.toContain("Contribution Stats:");
    expect(output).not.toContain("Roles:");
    expect(output).not.toContain("Focus Areas:");
    expect(output).not.toContain("Daily Activity Summary:");
  });

  it("should handle empty or missing data gracefully", () => {
    const emptyProfileData: UserProfileData = {
      ...mockProfileData, //
      username: "emptyuser",
      score: 0,
      monthlySummaries: [],
      weeklySummaries: [],
      roleTags: [],
      skillTags: [],
      focusAreaTags: [],
      dailyActivity: [],
      stats: { // stats could have 0s
        totalPrs: 0, mergedPrs: 0, closedPrs: 0,
        additions: 0, deletions: 0, changedFiles: 0,
      },
      totalXp: 0,
      totalLevel: 0,
    };
    const options: FormatProfileOptions = {
      includeBasicInfo: true,
      includeMonthlySummaries: true,
      includeWeeklySummaries: true,
      includeContributionStats: true,
      includeRoles: true,
      includeFocusAreas: true,
      includeSkills: true,
      includeDailyActivitySummary: true,
    };
    const output = formatProfileDataForCopy(emptyProfileData, options);
    expect(output).toContain("Username: emptyuser");
    expect(output).toContain("Contribution Stats:"); // Stats section title will still be there
    expect(output).toContain("Pull Requests: Total - 0, Merged - 0, Closed - 0");
    expect(output).not.toContain("Monthly Summaries:"); // Section title omitted if array is empty
    expect(output).not.toContain("Weekly Summaries:");
    expect(output).not.toContain("Roles:");
    expect(output).not.toContain("Focus Areas:");
    expect(output).not.toContain("Skills:");
    expect(output).not.toContain("Daily Activity Summary:");
    // Check specific non-existence of items from empty arrays
    expect(output).not.toContain("Monthly summary 1");
    expect(output).not.toContain("Role1");
  });

  it("should correctly format the Daily Activity Summary", () => {
    const options: FormatProfileOptions = {
      includeBasicInfo: false,
      includeMonthlySummaries: false,
      includeWeeklySummaries: false,
      includeContributionStats: false,
      includeRoles: false,
      includeFocusAreas: false,
      includeSkills: false,
      includeDailyActivitySummary: true,
    };
    const output = formatProfileDataForCopy(mockProfileData, options);
    expect(output).toContain("Daily Activity Summary:");
    expect(output).toContain("Active on 2 of the last 3 days.");
    expect(output).toContain("Total contributions in this period: 8");
    expect(output.trim()).toBe(
`Daily Activity Summary:
Active on 2 of the last 3 days.
Total contributions in this period: 8`
    );
  });
});

// Part 2 (ProfileCopyButton tests) will be attempted if environment allows.
// For now, focusing on Part 1.
