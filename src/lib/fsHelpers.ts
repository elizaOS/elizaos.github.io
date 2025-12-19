import * as fs from "fs/promises";
import * as path from "path";
import { join } from "path";
import { createHash } from "crypto";
import { IntervalType } from "@/lib/date-utils";

/**
 * Ensures a directory exists, creating it and all parent directories if needed
 */
export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Writes data to a file, ensuring the parent directory exists
 */
export async function writeToFile(filePath: string, data: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data, "utf-8");
}

/**
 * Generates a file path for repository data
 */
export function getRepoFilePath(
  outputDir: string,
  repoId: string,
  dataType: string,
  intervalType: string,
  fileName: string,
) {
  const safeRepoId = repoId.replace("/", "_");
  return path.join(outputDir, safeRepoId, dataType, intervalType, fileName);
}

/**
 * Generates a file path for overall summary data
 */
export function getOverallSummaryFilePath(
  baseDir: string,
  interval: IntervalType,
  filename: string,
) {
  const filePath = join(baseDir, "summaries", interval, filename);
  return filePath;
}

/**
 * Generates a file path for contributor summary data
 */
export function getContributorSummaryFilePath(
  baseDir: string,
  username: string,
  interval: IntervalType,
  filename: string,
): string {
  return join(
    baseDir,
    "contributors",
    username,
    "summaries",
    interval,
    filename,
  );
}

/**
 * Hash utility for content fingerprinting
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Generates a file path for API summary data
 */
export function getAPISummaryPath(
  baseDir: string,
  ...segments: string[]
): string {
  return join(baseDir, "api", "summaries", ...segments);
}

/**
 * Write JSON file and update latest pointer atomically
 */
export async function writeJSONWithLatest(
  jsonPath: string,
  latestPath: string,
  data: object,
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await writeToFile(jsonPath, json);
  await writeToFile(latestPath, json);
}

/**
 * Summary API response structure
 */
export interface SummaryAPIResponse {
  version: "1.0";
  type: "overall" | "repository" | "contributor";
  interval: IntervalType;
  date: string;
  generatedAt: string;
  sourceLastUpdated: string;
  contentFormat: "markdown";
  contentHash: string;
  entity?: {
    username?: string;
    repoId?: string;
    owner?: string;
    repo?: string;
  };
  content: string;
}

/**
 * Index item structure for summary indexes
 */
export interface SummaryIndexItem {
  date: string;
  sourceLastUpdated: string;
  contentHash: string;
  path: string;
}

/**
 * Summary index structure
 */
export interface SummaryIndex {
  version: "1.0";
  type: "overall" | "repository" | "contributor";
  interval: IntervalType;
  generatedAt: string;
  items: SummaryIndexItem[];
}

/**
 * Update summary index file (read-modify-write with sorted items)
 */
export async function updateSummaryIndex(
  indexPath: string,
  type: "overall" | "repository" | "contributor",
  interval: IntervalType,
  item: SummaryIndexItem,
): Promise<void> {
  let index: SummaryIndex;

  try {
    const existing = await fs.readFile(indexPath, "utf-8");
    index = JSON.parse(existing);
  } catch {
    // Create new index if file doesn't exist
    index = {
      version: "1.0",
      type,
      interval,
      generatedAt: new Date().toISOString(),
      items: [],
    };
  }

  // Update or add item
  const existingIndex = index.items.findIndex((i) => i.date === item.date);
  if (existingIndex >= 0) {
    index.items[existingIndex] = item;
  } else {
    index.items.push(item);
  }

  // Sort items by date descending (newest first)
  index.items.sort((a, b) => b.date.localeCompare(a.date));

  // Update generatedAt
  index.generatedAt = new Date().toISOString();

  await writeToFile(indexPath, JSON.stringify(index, null, 2));
}
