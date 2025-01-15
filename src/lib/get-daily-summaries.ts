import fs from "fs";
import path from "path";
import { glob } from "glob";

export interface DailySummary {
  title: string;
  version: string;
  overview: string;
  metrics: {
    contributors: number;
    merged_prs: number;
    new_issues: number;
    lines_changed: number;
  };
  changes: {
    features: string[];
    fixes: string[];
    chores: string[];
  };
  areas: Array<{
    name: string;
    files: number;
    additions: number;
    deletions: number;
  }>;
  issues_summary: string;
  questions: string[];
  top_contributors: Array<{
    name: string;
    summary: string;
    areas: string[];
  }>;
}

export async function getAllDailySummaryDates(): Promise<string[]> {
  const summaryFiles = await glob("data/daily/history/summary_*.json");
  return summaryFiles
    .map((file) => {
      const match = file.match(/summary_(\d{4}[-_]\d{2}[-_]\d{2})\.json$/);
      return match ? match[1].replace(/_/g, "-") : null;
    })
    .filter((date): date is string => date !== null)
    .sort()
    .reverse();
}

export async function getDailySummary(
  date: string
): Promise<DailySummary | null> {
  const normalizedDate = date.replace(/-/g, "_");
  const filePath = path.join(
    process.cwd(),
    "data/daily/history",
    `summary_${normalizedDate}.json`
  );

  try {
    const fileContents = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    return null;
  }
}