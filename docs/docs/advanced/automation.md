---
sidebar_position: 1
---

# Automation Strategy

The project relies heavily on GitHub Actions for automation, ensuring that data is always up-to-date and the website reflects the latest contributions. Our CI/CD strategy is built around a few key workflows.

## Core Workflows

### 1. `run-pipelines.yml`

This is the main data processing workflow, scheduled to run daily. Its job is to:

- Fetch the latest GitHub data from the configured repositories.
- Run the full `ingest → process → export → summarize` pipeline chain.
- Commit the newly generated data (JSON files, markdown summaries, and the updated database dump) to the `_data` branch.

This workflow can also be triggered manually from the GitHub Actions tab, which allows for running the pipeline with custom date ranges or forcing the regeneration of existing data.

### 2. `deploy.yml`

This workflow is responsible for building and deploying the website to GitHub Pages. It is triggered:

- On every push to the `main` branch.
- Manually, for on-demand deployments.
- Automatically, after a successful run of the `run-pipelines.yml` workflow.

Before building the site, this workflow checks out the latest data from the `_data` branch, ensuring that the deployed website is always synchronized with the latest analytics.

### 3. `pr-checks.yml`

This workflow serves as a quality gate for all pull requests. It runs a series of checks to maintain code quality and prevent regressions:

- **Linting and Typechecking**: Ensures all new code adheres to the project's style and type standards.
- **Build Verification**: Confirms that the application builds successfully with the proposed changes.
- **Pipeline Test**: Runs the data pipeline on a small, controlled sample of data to ensure its integrity.
- **Migration Verification**: Checks if schema changes are accompanied by the necessary migration files.

These workflows work together to create a robust, automated system for data management and deployment.
