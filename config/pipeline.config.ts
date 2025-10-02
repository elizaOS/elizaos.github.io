import { PipelineConfig } from "../src/lib/pipelines/pipelineConfig";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openrouterApiKey) {
  console.warn("OPENROUTER_API_KEY is not set");
}

/**
 * Contributor Analytics Pipeline Configuration
 *
 * This configuration controls how different contributions are scored and weighted
 * in the analytics pipeline. The scoring system emphasizes high-impact contributions
 * like merged PRs and substantive reviews, while applying multipliers based on
 * the affected areas of the codebase.
 */
export default {
  contributionStartDate: "2024-10-15",
  // Repositories to track
  repositories: [
    {
      owner: "elizaos",
      name: "eliza",
      defaultBranch: "main",
    },
    {
      owner: "elizaos",
      name: "auto.fun",
      defaultBranch: "develop",
    },
    {
      owner: "elizaos",
      name: "elizaos.github.io",
      defaultBranch: "main",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-solana",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-knowledge",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "registry",
      defaultBranch: "main",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-twitter",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-auton8n",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-evm",
      defaultBranch: "1.x",
    },
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
    {
      owner: "elizaos-plugins",
      name: "plugin-mcp",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-autocoder",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-discord",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-telegram",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-openrouter",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-openai",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-anthropic",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-relay",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-email",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-ollama",
      defaultBranch: "1.x",
    },
    {
      owner: "elizaos-plugins",
      name: "plugin-pdf",
      defaultBranch: "1.x",
    },
  ],
  walletAddresses: {
    enabled: true,
  },
  // List of bot usernames to ignore during processing
  botUsers: [
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
  ],

  // Scoring rules - controls how different contribution types are valued
  scoring: {
    // Pull Request scoring (highest weight category)
    // Points go to PR author
    pullRequest: {
      // Base points for creating a PR (awarded regardless of PR outcome)
      base: 4,

      // Additional points when a PR is merged (encourages completion)
      // Combined with base, merged PRs are worth 20 points total
      merged: 16,

      // Points per review received on the PR
      // Encourages seeking feedback, but has diminishing returns
      perReview: 1.5,

      // Additional points per approval received
      // Encourages addressing reviewer concerns
      perApproval: 2,

      // Points per comment received on the PR
      // Minor value to prevent gaming via comments
      perComment: 0.2,

      // Multiplier for PR description length
      // Rewards good documentation (e.g., 1000 char description = +3 points)
      descriptionMultiplier: 0.003,

      // Multiplier for PR complexity (based on files changed and lines)
      // Rewards tackling complex changes
      complexityMultiplier: 0.5,

      // Bonus for optimally sized PRs (100-500 lines)
      // Encourages manageable PRs rather than massive changes
      optimalSizeBonus: 5,

      // Maximum PRs per day that count for scoring
      // Prevents gaming via many small PRs
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
    // Points go to issue creator
    issue: {
      // Base points for creating an issue
      base: 2,

      // Points per comment received on the issue
      // Minor value to prevent gaming via comments
      perComment: 0.1,

      // Multipliers for issues with specific labels
      // Higher values for bugs vs enhancements vs documentation
      withLabelsMultiplier: {
        bug: 1.8, // 80% bonus for bug reports
        enhancement: 1.4, // 40% bonus for feature requests
        documentation: 1.0, // No bonus for documentation issues
      },

      // Bonus points when an issue is closed
      // Encourages following through to resolution
      closedBonus: 2,

      // Multiplier based on how quickly issues are resolved
      // Faster resolution = higher multiplier
      resolutionSpeedMultiplier: 1.0,
    },

    // Review scoring (second highest weight category)
    // Points go to the reviewer
    review: {
      // Base points for performing a review
      base: 4,

      // Additional points for approving a PR
      // Modest bonus to avoid rubber-stamping
      approved: 1,

      // Additional points for requesting changes
      // Higher than approvals to reward thorough reviews
      changesRequested: 2,

      // Additional points for leaving review comments
      // Minor bonus for lightweight feedback
      commented: 0.5,

      // Multiplier for detailed feedback in reviews
      // Rewards substantive comments (e.g., 1000 char review = +2 points)
      detailedFeedbackMultiplier: 0.002,

      // Multiplier for thorough reviews (triggers at 100+ chars)
      // Rewards in-depth analysis
      thoroughnessMultiplier: 1.3,

      // Maximum reviews per day that count for scoring
      // Prevents gaming via many superficial reviews
      maxPerDay: 8,
    },

    // Comment scoring (lowest weight category)
    // Points go to the commenter
    comment: {
      // Base points for leaving a comment
      // Intentionally low to prevent comment spam
      base: 0.2,

      // Multiplier for comment length
      // Modest reward for detailed comments
      substantiveMultiplier: 0.001,

      // Reduction factor for subsequent comments in the same thread
      // Prevents gaming via comment flooding (30% reduction per comment)
      diminishingReturns: 0.7,

      // Maximum comments per thread that count for scoring
      // Hard cap to prevent excessive commenting
      maxPerThread: 3,
    },

    // Code change scoring (applied to PRs)
    // Points go to the PR author
    codeChange: {
      // Points per line added
      // Intentionally lower than deletions to emphasize code quality over quantity
      perLineAddition: 0.005,

      // Points per line deleted
      // Higher value to encourage cleaning up technical debt
      perLineDeletion: 0.01,

      // Points per file changed
      // Rewards impactful changes across multiple files
      perFile: 0.15,

      // Maximum lines that count for scoring
      // Prevents massive auto-generated PRs from skewing scores
      maxLines: 800,

      // Bonus for test files in the PR
      // Strongly encourages test coverage
      testCoverageBonus: 2.0,
    },
  },

  // Tag definitions - used to categorize and weight different types of contributions
  tags: {
    // Area tags - recognize contribution to different parts of the codebase
    // These weights are used as multipliers for PR scores based on affected files
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

    // Role tags - recognize different types of contribution
    // These weights affect contributor expertise scoring, not direct points
    role: [
      {
        name: "architect",
        category: "ROLE",
        patterns: ["feat:", "refactor:", "breaking:"],
        // 2.5x weight for architecture expertise
        weight: 2.5,
        description: "Architects major features and refactorings",
      },
      {
        name: "maintainer",
        category: "ROLE",
        patterns: ["fix:", "chore:", "bump:", "update:"],
        // 2.0x weight for maintenance expertise
        weight: 2.0,
        description: "Maintains codebase health and fixes issues",
      },
      {
        name: "feature-dev",
        category: "ROLE",
        patterns: ["feat:", "feature:", "add:"],
        // 2.0x weight for feature development expertise
        weight: 2.0,
        description: "Develops new features",
      },
      {
        name: "bug-fixer",
        category: "ROLE",
        patterns: ["fix:", "bug:", "hotfix:"],
        // 2.2x weight for bug fixing expertise
        weight: 2.2,
        description: "Identifies and fixes bugs",
      },
      {
        name: "docs-writer",
        category: "ROLE",
        patterns: ["docs:", "documentation:"],
        // 1.2x weight for documentation expertise (lower priority)
        weight: 1.2,
        description: "Writes and improves documentation",
      },
      {
        name: "reviewer",
        category: "ROLE",
        patterns: ["review:", "feedback:"],
        // 1.8x weight for review expertise
        weight: 1.8,
        description: "Reviews code and provides feedback",
      },
      {
        name: "devops",
        category: "ROLE",
        patterns: ["ci:", "cd:", "deploy:", "build:"],
        // 2.2x weight for DevOps expertise
        weight: 2.2,
        description: "Works on CI/CD and deployment infrastructure",
      },
    ],

    // Tech tags - recognize technology expertise
    // These weights affect contributor expertise scoring, not direct points
    tech: [
      {
        name: "typescript",
        category: "TECH",
        patterns: [".ts", ".tsx", "tsconfig"],
        // 1.5x weight for TypeScript expertise
        weight: 1.5,
        description: "TypeScript language expertise",
      },
      {
        name: "react",
        category: "TECH",
        patterns: ["react", ".jsx", ".tsx", "component"],
        // 1.4x weight for React expertise
        weight: 1.4,
        description: "React framework expertise",
      },
      {
        name: "nextjs",
        category: "TECH",
        patterns: ["next.", "nextjs", "pages/", "app/"],
        // 1.6x weight for Next.js expertise
        weight: 1.6,
        description: "Next.js framework expertise",
      },
      {
        name: "tailwind",
        category: "TECH",
        patterns: ["tailwind", "tw-", "className"],
        // 1.2x weight for Tailwind expertise
        weight: 1.2,
        description: "Tailwind CSS expertise",
      },
      {
        name: "database",
        category: "TECH",
        patterns: ["sql", "db", "database", "query", "schema"],
        // 1.7x weight for database expertise
        weight: 1.7,
        description: "Database and SQL expertise",
      },
      {
        name: "api",
        category: "TECH",
        patterns: ["api", "rest", "graphql", "endpoint"],
        // 1.6x weight for API expertise
        weight: 1.6,
        description: "API design and implementation",
      },
    ],
  },

  // AI Summary generation (optional)
  aiSummary: {
    enabled: true,
    defaultModel: "google/gemini-2.0-flash-001",
    models: {
      day: process.env.SMALL_MODEL || "google/gemini-2.5-flash",
      week: process.env.LARGE_MODEL || "google/gemini-2.5-pro",
      month: process.env.LARGE_MODEL || "google/gemini-2.5-pro",
    },
    temperature: 0.1,
    max_tokens: 2000,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: openrouterApiKey || "",
    projectContext: `
     We are ElizaOS. Our mission is to develop an extensible, modular, open-source AI agent framework that thrives across both Web2 and Web3 ecosystems. We see AI agents as the key stepping stones toward AGI, enabling increasingly autonomous and capable systems.

  Core Philosophy
    Autonomy & Adaptability: Agents should learn, reason, and adapt across diverse tasks without human intervention.
    Modularity & Composability: AI architectures should be modular, allowing for iterative improvements and robust scalability.
    Decentralization & Open Collaboration: AI systems should move beyond centralized control towards distributed intelligence and community-driven progress.
    `,
  },
} as const satisfies PipelineConfig;
