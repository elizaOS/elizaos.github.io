import { PipelineConfig } from "../src/lib/pipelines/pipelineConfig";
import deploymentConfig from "./loadDeploymentConfig";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openrouterApiKey) {
  console.warn("OPENROUTER_API_KEY is not set");
}

/**
 * Default bot usernames to ignore during processing
 * These are common CI/automation bots across most projects
 */
const defaultBotUsers = [
  "dependabot",
  "dependabot-preview",
  "renovate",
  "renovate-bot",
  "renovate[bot]",
  "github-actions",
  "github-actions[bot]",
  "github-bot",
  "codecov",
  "codecov-io",
  "stale[bot]",
  "semantic-release-bot",
  "copilot-pull-request-reviewer",
  "imgbot",
  "coderabbitai",
  "codefactor-io",
  "graphite-app",
  "google-labs-jules[bot]",
  "cursor",
  "claude",
];

/**
 * Build project context for AI summaries from deployment config
 */
const projectContext = `
${deploymentConfig.projectDescription}

${deploymentConfig.projectPhilosophy}
`.trim();

/**
 * Contributor Analytics Pipeline Configuration
 *
 * This configuration controls how different contributions are scored and weighted
 * in the analytics pipeline. The scoring system emphasizes high-impact contributions
 * like merged PRs and substantive reviews, while applying multipliers based on
 * the affected areas of the codebase.
 *
 * FORK CUSTOMIZATION:
 * Fork-specific values (repositories, project context, etc.) are loaded from
 * config/deployment.config.ts if it exists, otherwise from config/example.config.ts.
 *
 * To customize for your fork:
 * 1. Copy config/example.config.ts to config/deployment.config.ts
 * 2. Edit deployment.config.ts with your organization's values
 * 3. deployment.config.ts is gitignored, so your changes won't conflict with upstream
 */
export default {
  // Fork-specific values from deployment config
  contributionStartDate: deploymentConfig.contributionStartDate,
  repositories: deploymentConfig.repositories,

  walletAddresses: {
    enabled: true,
  },

  // Merge default bot users with any additional ones from deployment config
  botUsers: [
    ...defaultBotUsers,
    ...(deploymentConfig.additionalBotUsers || []),
  ],

  // Scoring rules - controls how different contribution types are valued
  scoring: {
    // Pull Request scoring (highest weight category)
    pullRequest: {
      base: 4,
      merged: 16,
      perReview: 1.5,
      perApproval: 2,
      perComment: 0.2,
      descriptionMultiplier: 0.003,
      complexityMultiplier: 0.5,
      optimalSizeBonus: 5,
      maxPerDay: 10,
      closingIssueBonus: 5,
    },
    reaction: {
      diminishingReturns: 0.7,
      base: 0.5,
      received: 0.1,
      maxPerDay: 10,
      types: {
        thumbs_up: 1.2,
        thumbs_down: 0.5,
        laugh: 1.0,
        hooray: 1.5,
        confused: 0.5,
        heart: 1.5,
        rocket: 1.5,
        eyes: 1.2,
      },
    },
    // Issue scoring (medium weight category)
    issue: {
      base: 2,
      perComment: 0.1,
      withLabelsMultiplier: {
        bug: 1.8,
        enhancement: 1.4,
        documentation: 1.0,
      },
      closedBonus: 2,
      resolutionSpeedMultiplier: 1.0,
    },
    // Review scoring (second highest weight category)
    review: {
      base: 4,
      approved: 1,
      changesRequested: 2,
      commented: 0.5,
      detailedFeedbackMultiplier: 0.002,
      thoroughnessMultiplier: 1.3,
      maxPerDay: 8,
    },
    // Comment scoring (lowest weight category)
    comment: {
      base: 0.2,
      substantiveMultiplier: 0.001,
      diminishingReturns: 0.7,
      maxPerThread: 3,
    },
    // Code change scoring (applied to PRs)
    codeChange: {
      perLineAddition: 0.005,
      perLineDeletion: 0.01,
      perFile: 0.15,
      maxLines: 800,
      testCoverageBonus: 2.0,
    },
  },

  // Tag definitions - used to categorize and weight different types of contributions
  tags: {
    area: [
      {
        name: "core",
        category: "AREA",
        patterns: ["core/", "src/core", "packages/core"],
        weight: 2.5,
        description: "Core system components and libraries",
      },
      {
        name: "ui",
        category: "AREA",
        patterns: ["components/", "ui/", "src/components", "pages/"],
        weight: 1.8,
        description: "User interface and component libraries",
      },
      {
        name: "docs",
        category: "AREA",
        patterns: ["docs/", "README", ".md"],
        weight: 1.5,
        description: "Documentation and guides",
      },
      {
        name: "infra",
        category: "AREA",
        patterns: [".github/", "docker", "k8s", ".yml", ".yaml"],
        weight: 1.8,
        description: "Infrastructure and deployment",
      },
      {
        name: "tests",
        category: "AREA",
        patterns: ["test/", "tests/", ".spec.", ".test."],
        weight: 2.0,
        description: "Test files and test infrastructure",
      },
    ],
    role: [
      {
        name: "architect",
        category: "ROLE",
        patterns: ["feat:", "refactor:", "breaking:"],
        weight: 2.5,
        description: "Architects major features and refactorings",
      },
      {
        name: "maintainer",
        category: "ROLE",
        patterns: ["fix:", "chore:", "bump:", "update:"],
        weight: 2.0,
        description: "Maintains codebase health and fixes issues",
      },
      {
        name: "feature-dev",
        category: "ROLE",
        patterns: ["feat:", "feature:", "add:"],
        weight: 2.0,
        description: "Develops new features",
      },
      {
        name: "bug-fixer",
        category: "ROLE",
        patterns: ["fix:", "bug:", "hotfix:"],
        weight: 2.2,
        description: "Identifies and fixes bugs",
      },
      {
        name: "docs-writer",
        category: "ROLE",
        patterns: ["docs:", "documentation:"],
        weight: 1.2,
        description: "Writes and improves documentation",
      },
      {
        name: "reviewer",
        category: "ROLE",
        patterns: ["review:", "feedback:"],
        weight: 1.8,
        description: "Reviews code and provides feedback",
      },
      {
        name: "devops",
        category: "ROLE",
        patterns: ["ci:", "cd:", "deploy:", "build:"],
        weight: 2.2,
        description: "Works on CI/CD and deployment infrastructure",
      },
    ],
    tech: [
      {
        name: "typescript",
        category: "TECH",
        patterns: [".ts", ".tsx", "tsconfig"],
        weight: 1.5,
        description: "TypeScript language expertise",
      },
      {
        name: "react",
        category: "TECH",
        patterns: ["react", ".jsx", ".tsx", "component"],
        weight: 1.4,
        description: "React framework expertise",
      },
      {
        name: "nextjs",
        category: "TECH",
        patterns: ["next.", "nextjs", "pages/", "app/"],
        weight: 1.6,
        description: "Next.js framework expertise",
      },
      {
        name: "tailwind",
        category: "TECH",
        patterns: ["tailwind", "tw-", "className"],
        weight: 1.2,
        description: "Tailwind CSS expertise",
      },
      {
        name: "database",
        category: "TECH",
        patterns: ["sql", "db", "database", "query", "schema"],
        weight: 1.7,
        description: "Database and SQL expertise",
      },
      {
        name: "api",
        category: "TECH",
        patterns: ["api", "rest", "graphql", "endpoint"],
        weight: 1.6,
        description: "API design and implementation",
      },
    ],
  },

  // AI Summary generation
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
    apiKey: openrouterApiKey || "",
    projectContext,
  },
} as const satisfies PipelineConfig;
