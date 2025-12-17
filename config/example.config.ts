/**
 * Deployment Configuration
 *
 * This file contains fork-specific configuration values.
 * It serves as both the default configuration for upstream AND a template for forks.
 *
 * FOR FORKS:
 * 1. Copy this file: cp example.config.ts deployment.config.ts
 * 2. Edit deployment.config.ts with your organization's values
 * 3. deployment.config.ts is gitignored, so your changes won't conflict with upstream
 *
 * The pipeline will automatically use deployment.config.ts if it exists,
 * otherwise it falls back to this file (example.config.ts).
 */

import type { RepositoryConfig } from "../src/lib/pipelines/pipelineConfig";

export interface DeploymentConfig {
  /** Display name for your organization/project */
  organizationName: string;

  /** Brief description of your project for AI context */
  projectDescription: string;

  /** Core philosophy or mission statement (used in AI summaries) */
  projectPhilosophy: string;

  /** Date to start tracking contributions (YYYY-MM-DD format) */
  contributionStartDate: string;

  /** GitHub repositories to track */
  repositories: RepositoryConfig[];

  /** Additional bot usernames to ignore (merged with defaults) */
  additionalBotUsers?: string[];
}

/**
 * ElizaOS Default Configuration
 *
 * This is the production configuration for elizaos.github.io.
 * Forks should copy this file to deployment.config.ts and customize.
 */
const config: DeploymentConfig = {
  organizationName: "ElizaOS",

  projectDescription: `
We are ElizaOS. Our mission is to develop an extensible, modular, open-source
AI agent framework that thrives across both Web2 and Web3 ecosystems. We see
AI agents as the key stepping stones toward AGI, enabling increasingly
autonomous and capable systems.
  `.trim(),

  projectPhilosophy: `
Core Philosophy:
- Autonomy & Adaptability: Agents should learn, reason, and adapt across diverse tasks without human intervention.
- Modularity & Composability: AI architectures should be modular, allowing for iterative improvements and robust scalability.
- Decentralization & Open Collaboration: AI systems should move beyond centralized control towards distributed intelligence and community-driven progress.
  `.trim(),

  contributionStartDate: "2024-10-15",

  repositories: [
    // Core platform
    { owner: "elizaos", name: "eliza", defaultBranch: "main" },
    { owner: "elizaos", name: "elizaos.github.io", defaultBranch: "main" },
    { owner: "elizaos", name: "docs", defaultBranch: "main" },
    // Applications
    { owner: "elizaos", name: "x402.elizaos.ai", defaultBranch: "main" },
    { owner: "elizaos", name: "spartan", defaultBranch: "main" },
    { owner: "elizaos", name: "jeju", defaultBranch: "main" },
    // Plugins
    { owner: "elizaos-plugins", name: "plugin-solana", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-knowledge",
      defaultBranch: "1.x",
    },
    { owner: "elizaos-plugins", name: "plugin-chart", defaultBranch: "main" },
    {
      owner: "elizaos-plugins",
      name: "plugin-analytics",
      defaultBranch: "main",
    },
    { owner: "elizaos-plugins", name: "plugin-jupiter", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-trust", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-rolodex", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-birdeye", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-digitaltwin",
      defaultBranch: "main",
    },
    { owner: "elizaos-plugins", name: "plugin-mysql", defaultBranch: "main" },
    {
      owner: "elizaos-plugins",
      name: "plugin-elizaos-cloud",
      defaultBranch: "main",
    },
    { owner: "elizaos-plugins", name: "registry", defaultBranch: "main" },
    { owner: "elizaos-plugins", name: "plugin-twitter", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-auton8n", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-evm", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-coingecko",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-farcaster",
      defaultBranch: "1.x",
    },
    { owner: "elizaos-plugins", name: "plugin-mcp", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-autocoder",
      defaultBranch: "1.x",
    },
    { owner: "elizaos-plugins", name: "plugin-discord", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-telegram", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-openrouter",
      defaultBranch: "1.x",
    },
    { owner: "elizaos-plugins", name: "plugin-openai", defaultBranch: "1.x" },
    {
      owner: "elizaos-plugins",
      name: "plugin-anthropic",
      defaultBranch: "1.x",
    },
    { owner: "elizaos-plugins", name: "plugin-relay", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-email", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-ollama", defaultBranch: "1.x" },
    { owner: "elizaos-plugins", name: "plugin-pdf", defaultBranch: "1.x" },
  ],

  additionalBotUsers: [
    // Add any ElizaOS-specific bot usernames here
  ],
};

export default config;
