import type { TagData } from "@/components/skill-card";
import type { Summary } from "@/components/summary-card";
import type { UserActivityHeatmap } from "@/lib/scoring/queries";
import type { UserBadge } from "@/lib/badges/types";
import type { UserStats } from "@/app/profile/[username]/components/UserProfile";

export interface ProfileData {
  username: string;
  totalLevel: number;
  totalXp: number;
  stats: UserStats;
  monthlySummaries: Summary[];
  weeklySummaries: Summary[];
  roleTags: TagData[];
  skillTags: TagData[];
  focusAreaTags: TagData[];
  dailyActivity: UserActivityHeatmap[];
  userBadges: UserBadge[];
  badgeProgress: Record<string, number>;
}

export interface ProfileFormatOptions {
  includeStats: boolean;
  includeSummaries: boolean;
  includeTags: boolean;
  includeBadges: boolean;
  includeActivity: boolean;
}

export function formatProfileForLLM(
  data: ProfileData,
  options: ProfileFormatOptions,
): string {
  const parts: string[] = [];

  // Metadata Section (always included)
  parts.push("## Profile Metadata");
  parts.push("```json");
  parts.push(
    JSON.stringify(
      {
        username: data.username,
        level: data.totalLevel,
        total_xp: Math.round(data.totalXp),
      },
      null,
      2,
    ),
  );
  parts.push("```");
  parts.push("");

  // Statistics Section
  if (options.includeStats) {
    parts.push("## Statistics");
    parts.push("```json");
    parts.push(
      JSON.stringify(
        {
          pull_requests: {
            total: data.stats.totalPrs,
            merged: data.stats.mergedPrs,
            closed: data.stats.closedPrs,
          },
          code_changes: {
            files_changed: data.stats.changedFiles,
            lines_added: data.stats.additions,
            lines_deleted: data.stats.deletions,
          },
        },
        null,
        2,
      ),
    );
    parts.push("```");
    parts.push("");
  }

  // Summaries Section
  if (options.includeSummaries) {
    const monthlySummariesWithContent = data.monthlySummaries.filter(
      (s) => s.summary && s.summary.trim() !== "",
    );
    const weeklySummariesWithContent = data.weeklySummaries.filter(
      (s) => s.summary && s.summary.trim() !== "",
    );

    if (monthlySummariesWithContent.length > 0) {
      parts.push("## Monthly Summaries");
      parts.push("");
      for (const summary of monthlySummariesWithContent) {
        parts.push(`### ${summary.date}`);
        parts.push(summary.summary || "");
        parts.push("");
      }
    }

    if (weeklySummariesWithContent.length > 0) {
      parts.push("## Weekly Summaries");
      parts.push("");
      for (const summary of weeklySummariesWithContent) {
        parts.push(`### ${summary.date}`);
        parts.push(summary.summary || "");
        parts.push("");
      }
    }
  }

  // Tags Section
  if (options.includeTags) {
    const formatTags = (tags: TagData[]) =>
      tags.map((tag) => ({
        name: tag.tagName,
        level: tag.level,
        xp: Math.round(tag.score),
        progress_to_next: Math.round(tag.progress * 100),
      }));

    parts.push("## Tags & Expertise");
    parts.push("```json");
    parts.push(
      JSON.stringify(
        {
          roles: formatTags(data.roleTags),
          focus_areas: formatTags(data.focusAreaTags),
          skills: formatTags(data.skillTags),
        },
        null,
        2,
      ),
    );
    parts.push("```");
    parts.push("");
  }

  // Badges Section
  if (options.includeBadges) {
    const earnedBadges = data.userBadges.map((badge) => ({
      type: badge.badgeType,
      tier: badge.tier,
      earned_at: badge.earnedAt,
    }));

    const progressBadges = Object.entries(data.badgeProgress).map(
      ([type, value]) => ({
        type,
        current_value: value,
      }),
    );

    parts.push("## Badges & Achievements");
    parts.push("```json");
    parts.push(
      JSON.stringify(
        {
          earned: earnedBadges,
          progress: progressBadges,
        },
        null,
        2,
      ),
    );
    parts.push("```");
    parts.push("");
  }

  // Activity Section
  if (options.includeActivity && data.dailyActivity.length > 0) {
    const activityData = data.dailyActivity.map((day) => ({
      date: day.date,
      score: day.value,
      breakdown: day.breakdown,
    }));

    parts.push("## Activity (Last 30 Days)");
    parts.push("```json");
    parts.push(JSON.stringify(activityData, null, 2));
    parts.push("```");
    parts.push("");
  }

  return parts.join("\n");
}
