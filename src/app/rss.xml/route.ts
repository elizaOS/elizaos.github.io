import { db } from "@/lib/data/db";
import { overallSummaries } from "@/lib/data/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-static";
export const revalidate = 3600; // Revalidate every hour

/**
 * Escape text for safe XML output (text nodes and attributes)
 * Must be applied to ALL dynamic values inserted into XML
 */
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Strip markdown formatting for plain text display
 * NOTE: This is NOT a sanitizer - escapeXml() is the security control
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/^[-*+]\s/gm, "• ") // List items
    .trim();
}

/**
 * Validate SITE_URL - must be valid http/https URL
 */
function validateSiteUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Parse date string, returning null for invalid dates
 */
function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const siteUrl = validateSiteUrl(process.env.SITE_URL);
  if (!siteUrl) {
    return new Response("RSS feed unavailable: SITE_URL not configured", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const [dailySummaries, weeklySummaries, monthlySummaries] = await Promise.all(
    [
      db
        .select()
        .from(overallSummaries)
        .where(eq(overallSummaries.intervalType, "day"))
        .orderBy(desc(overallSummaries.date))
        .limit(30),
      db
        .select()
        .from(overallSummaries)
        .where(eq(overallSummaries.intervalType, "week"))
        .orderBy(desc(overallSummaries.date))
        .limit(4),
      db
        .select()
        .from(overallSummaries)
        .where(eq(overallSummaries.intervalType, "month"))
        .orderBy(desc(overallSummaries.date))
        .limit(1),
    ],
  );

  const title = process.env.NEXT_PUBLIC_SITE_NAME || "HiScores";

  const formatItem = (
    summary: (typeof dailySummaries)[number],
    intervalType: "day" | "week" | "month",
    labelPrefix: string,
  ) => {
    // URL-encode path segments, then XML-escape the full URL
    const dateSeg = encodeURIComponent(String(summary.date));
    const link = escapeXml(`${siteUrl}/summary/${intervalType}/${dateSeg}`);
    const itemTitle = escapeXml(`${labelPrefix}: ${summary.date}`);
    const pubDate = escapeXml(
      parseDate(summary.date)?.toUTCString() ?? new Date().toUTCString(),
    );

    const description = summary.summary
      ? stripMarkdown(summary.summary).slice(0, 500)
      : `${labelPrefix} contributor activity summary`;

    return `
    <item>
      <title>${itemTitle}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}${description.length >= 500 ? "..." : ""}</description>
    </item>`;
  };

  // Combine all summaries with their type, then sort by date descending
  const allSummaries = [
    ...monthlySummaries.map((s) => ({
      ...s,
      intervalType: "month" as const,
      labelPrefix: "Monthly Summary",
    })),
    ...weeklySummaries.map((s) => ({
      ...s,
      intervalType: "week" as const,
      labelPrefix: "Weekly Summary",
    })),
    ...dailySummaries.map((s) => ({
      ...s,
      intervalType: "day" as const,
      labelPrefix: "Daily Summary",
    })),
  ].sort((a, b) => {
    const dateA = parseDate(a.date)?.getTime() ?? 0;
    const dateB = parseDate(b.date)?.getTime() ?? 0;
    return dateB - dateA; // Descending (newest first)
  });

  const items = allSummaries
    .map((s) => formatItem(s, s.intervalType, s.labelPrefix))
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Daily, weekly, and monthly contributor activity summaries</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
