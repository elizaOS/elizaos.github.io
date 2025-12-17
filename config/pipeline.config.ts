/**
 * Pipeline Configuration
 *
 * This config reads from environment variables or config.json file.
 * No hardcoded org-specific data - all values come from external sources.
 *
 * Data sources (in priority order):
 * 1. Environment variables (GitHub Secrets, workflow env:, .env.local)
 * 2. config/config.json file (for local development)
 *
 * For local dev:
 *   cp config/config.example.json config/config.json
 *   # Edit config.json with your values
 *
 * For CI/CD:
 *   Set env vars in your workflow file
 */

import { PipelineConfig } from "../src/lib/pipelines/pipelineConfig";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Try to load JSON config file (for local dev)
// Use process.cwd() for Next.js compatibility during build
let jsonConfig: Record<string, unknown> = {};
const configPaths = [
  join(process.cwd(), "config", "config.json"),
  join(__dirname, "config.json"),
];

for (const configPath of configPaths) {
  if (existsSync(configPath)) {
    try {
      jsonConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      break;
    } catch (e) {
      console.warn(`Failed to parse ${configPath}:`, e);
    }
  }
}

/**
 * Get a string config value from env var or JSON file
 */
const getConfig = (key: string): string => {
  const value = process.env[key] ?? jsonConfig[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Missing required config: ${key}\n` +
        `Set it via environment variable or in config/config.json\n` +
        `See config/config.example.json for reference.`,
    );
  }
  return typeof value === "string" ? value : JSON.stringify(value);
};

/**
 * Get a JSON config value from env var or JSON file
 */
const getJsonConfig = <T>(key: string): T => {
  const value = process.env[key] ?? jsonConfig[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Missing required config: ${key}\n` +
        `Set it via environment variable or in config/config.json\n` +
        `See config/config.example.json for reference.`,
    );
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      throw new Error(`Failed to parse ${key} as JSON: ${e}`);
    }
  }
  return value as T;
};

// All data comes from external sources - no hardcoded org-specific values
export default {
  contributionStartDate: getConfig("PIPELINE_START_DATE"),
  repositories: getJsonConfig("PIPELINE_REPOS"),
  botUsers: getJsonConfig("PIPELINE_BOT_USERS"),
  scoring: getJsonConfig("PIPELINE_SCORING"),
  tags: getJsonConfig("PIPELINE_TAGS"),

  walletAddresses: {
    enabled: true,
  },

  aiSummary: {
    enabled: true,
    defaultModel: "google/gemini-2.5-flash",
    models: {
      day: process.env.SMALL_MODEL || "google/gemini-2.5-flash",
      week: process.env.LARGE_MODEL || "google/gemini-2.5-pro",
      month: process.env.LARGE_MODEL || "google/gemini-2.5-pro",
    },
    temperature: 0.1,
    max_tokens: 2400,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    projectContext: getConfig("PIPELINE_PROJECT_CONTEXT"),
  },
} as const satisfies PipelineConfig;
