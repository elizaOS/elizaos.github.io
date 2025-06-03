import { UserProfileData } from "@/app/profile/[username]/queries";
import { Summary } from "@/components/summary-card"; // Assuming Summary is exported from summary-card
import { TagData } from "@/components/skill-card"; // Assuming TagData is exported from skill-card

export interface FormatProfileOptions {
  includeBasicInfo: boolean;
  includeMonthlySummaries: boolean;
  includeWeeklySummaries: boolean;
  includeContributionStats: boolean;
  includeRoles: boolean;
  includeFocusAreas: boolean;
  includeSkills: boolean;
  includeDailyActivitySummary: boolean;
}

// Helper function for formatting tags
function formatTags(title: string, tags: TagData[]): string[] {
  if (!tags || tags.length === 0) return [];
  const tagLines = tags.map(tag => `- ${tag.tagName} (Score: ${tag.score}, Level: ${tag.level})`);
  return [title, ...tagLines, ""];
}

export function formatProfileDataForCopy(
  profileData: UserProfileData,
  options: FormatProfileOptions
): string {
  const parts: string[] = [];

  if (options.includeBasicInfo) {
    parts.push(`Username: ${profileData.username}`);
    parts.push(`Level: ${profileData.totalLevel}`);
    parts.push(`XP: ${Math.round(profileData.totalXp).toLocaleString()}`);
    parts.push(`GitHub: https://github.com/${profileData.username}`);
    parts.push(""); // Newline
  }

  if (options.includeMonthlySummaries && profileData.monthlySummaries && profileData.monthlySummaries.length > 0) {
    parts.push("Monthly Summaries:");
    profileData.monthlySummaries.forEach((summary: Summary) => {
      // Assuming summary.date is a string like "YYYY-MM-DD" or a Date object that converts to a readable string.
      // If it's a Date object, you might want to format it e.g. summary.date.toISOString().split('T')[0]
      parts.push(`- [${summary.date}]: ${summary.summary}`);
    });
    parts.push(""); // Newline
  }

  if (options.includeWeeklySummaries && profileData.weeklySummaries && profileData.weeklySummaries.length > 0) {
    parts.push("Weekly Summaries:");
    profileData.weeklySummaries.forEach((summary: Summary) => {
      parts.push(`- [${summary.date}]: ${summary.summary}`);
    });
    parts.push(""); // Newline
  }

  if (options.includeContributionStats && profileData.stats) {
    parts.push("Contribution Stats:");
    parts.push(`  Pull Requests: Total - ${profileData.stats.totalPrs}, Merged - ${profileData.stats.mergedPrs}, Closed - ${profileData.stats.closedPrs}`);
    parts.push(`  Code Contributions: Files Changed - ${profileData.stats.changedFiles}, Additions - ${profileData.stats.additions}, Deletions - ${profileData.stats.deletions}`);
    parts.push(""); // Newline
  }

  if (options.includeRoles) {
    parts.push(...formatTags("Roles:", profileData.roleTags));
  }

  if (options.includeFocusAreas) {
    parts.push(...formatTags("Focus Areas:", profileData.focusAreaTags));
  }

  if (options.includeSkills) {
    parts.push(...formatTags("Skills:", profileData.skillTags));
  }

  if (options.includeDailyActivitySummary && profileData.dailyActivity && profileData.dailyActivity.length > 0) {
    parts.push("Daily Activity Summary:");
    const activeDays = profileData.dailyActivity.filter(day => day.count > 0).length;
    parts.push(`Active on ${activeDays} of the last ${profileData.dailyActivity.length} days.`);
    const totalContributions = profileData.dailyActivity.reduce((sum, day) => sum + day.count, 0);
    parts.push(`Total contributions in this period: ${totalContributions}`);
    parts.push(""); // Newline
  }

  return parts.join("\n").trim();
}
