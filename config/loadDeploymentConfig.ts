/**
 * Deployment Configuration Loader
 *
 * Attempts to load deployment.config.ts (fork-specific, gitignored).
 * Falls back to example.config.ts values if deployment config doesn't exist.
 *
 * This enables forks to customize their deployment without modifying
 * tracked files, making upstream syncs conflict-free.
 */

import type { DeploymentConfig } from "./example.config";
import exampleConfig from "./example.config";

let deploymentConfig: DeploymentConfig;

try {
  // Try to load fork-specific deployment config
  // This file is gitignored, so forks can customize without conflicts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const customConfig = require("./deployment.config").default;
  deploymentConfig = customConfig;
} catch {
  // Fall back to example config if deployment.config.ts doesn't exist
  // This is expected for upstream repo and fresh forks
  deploymentConfig = exampleConfig;
}

export default deploymentConfig;
