/**
 * Pipeline Configuration
 *
 * This config reads from a JSON file specified by PIPELINE_CONFIG_FILE env var.
 * No hardcoded org-specific data - all values come from external sources.
 *
 * Data sources:
 * 1. JSON file specified by PIPELINE_CONFIG_FILE (e.g., "config/example.json")
 * 2. Environment variables as fallback
 *
 * For CI/CD (GitHub Actions):
 *   PIPELINE_CONFIG_FILE is set in workflow env: section
 *   Points to config/example.json by default, or custom via secrets
 *
 * For local dev:
 *   export PIPELINE_CONFIG_FILE=config/example.json
 *   # Or add to .env.local: PIPELINE_CONFIG_FILE=config/example.json
 */

import { PipelineConfig } from "../src/lib/pipelines/pipelineConfig";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Load JSON config file from PIPELINE_CONFIG_FILE env var
let jsonConfig: Record<string, unknown> = {};

const configFile = process.env.PIPELINE_CONFIG_FILE;
if (configFile) {
  // Try multiple paths to handle different execution contexts (Next.js build, CLI, etc.)
  const configPaths = [
    join(process.cwd(), configFile),
    join(__dirname, "..", configFile),
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
}

/**
 * Get a string config value from JSON file first, then env var
 */
const getConfig = (key: string): string => {
  const value = jsonConfig[key] ?? process.env[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Missing required config: ${key}\n` +
        `Set PIPELINE_CONFIG_FILE env var (e.g., "config/elizaos.json")\n` +
        `See config/example.json for available keys.`,
    );
  }
  return typeof value === "string" ? value : JSON.stringify(value);
};

/**
 * Get a JSON config value from JSON file first, then env var
 */
const getJsonConfig = <T>(key: string): T => {
  const value = jsonConfig[key] ?? process.env[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Missing required config: ${key}\n` +
        `Set PIPELINE_CONFIG_FILE env var (e.g., "config/elizaos.json")\n` +
        `See config/example.json for available keys.`,
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
