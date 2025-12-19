import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { IntervalType } from "@/lib/date-utils";

/**
 * Normalize a string for use as a path segment
 */
export function normalizePathSegment(segment: string): string {
  return segment.replace(/\.\./g, "").replace(/[\/\\]/g, "_");
}

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
  const normalizedRepoId = normalizePathSegment(repoId);
  return path.join(
    outputDir,
    normalizedRepoId,
    dataType,
    intervalType,
    fileName,
  );
}

/**
 * Generates a file path for overall summary data
 */
export function getOverallSummaryFilePath(
  baseDir: string,
  interval: IntervalType,
  filename: string,
) {
  return path.join(baseDir, "summaries", interval, filename);
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
  return path.join(
    baseDir,
    "contributors",
    normalizePathSegment(username),
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
  return path.join(
    baseDir,
    "api",
    "summaries",
    ...segments.map(normalizePathSegment),
  );
}

/**
 * Write JSON file and update latest pointer
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
  } catch (error) {
    const isFileNotFound =
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT";

    if (!isFileNotFound) {
      // Log but continue with fresh index if parse fails
      console.warn(
        `Warning: Could not parse index at ${indexPath}, creating fresh index`,
      );
    }

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

/**
 * Write a summary to the JSON API with latest pointer and index update
 */
export async function writeSummaryToAPI(
  outputDir: string,
  type: "overall" | "repository" | "contributor",
  intervalType: IntervalType,
  date: string,
  summary: string,
  identifier?: string,
  entity?: SummaryAPIResponse["entity"],
): Promise<string> {
  const now = new Date().toISOString();
  const contentHash = sha256(summary);

  const response: SummaryAPIResponse = {
    version: "1.0",
    type,
    interval: intervalType,
    date,
    generatedAt: now,
    sourceLastUpdated: now,
    contentFormat: "markdown",
    contentHash,
    ...(entity && { entity }),
    content: summary,
  };

  // Build path segments based on type
  if (type !== "overall" && !identifier) {
    throw new Error(`identifier required for ${type} summary type`);
  }
  const pathSegments: string[] =
    type === "overall"
      ? ["overall", intervalType]
      : type === "repository"
        ? ["repos", identifier!, intervalType]
        : ["contributors", identifier!, intervalType];

  const jsonFilename = `${date}.json`;
  const jsonPath = getAPISummaryPath(outputDir, ...pathSegments, jsonFilename);
  const latestPath = getAPISummaryPath(
    outputDir,
    ...pathSegments,
    "latest.json",
  );
  const indexPath = getAPISummaryPath(outputDir, ...pathSegments, "index.json");

  await writeJSONWithLatest(jsonPath, latestPath, response);
  await updateSummaryIndex(indexPath, type, intervalType, {
    date,
    sourceLastUpdated: now,
    contentHash,
    path: jsonFilename,
  });

  return jsonPath;
}
