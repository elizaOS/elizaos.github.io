# Multi-Repository Support Implementation Tasks

This document breaks down the implementation tasks for adding multi-repository support to the Eliza Leaderboard, based on the phases outlined in `plan/multi-repo.md`.

## Phase 1: Foundational Multi-Repo Support

**Goal:** Enable the pipeline to ingest, process, and store data from multiple configured repositories, with basic per-repository output.

- [x] **Task 1.1: Modify `pipeline.config.ts` Structure**
  - [x] Update the `repositories` array in `config/pipeline.config.ts` to accept objects containing `owner`, `name`, and `repoId` (e.g., `{ owner: "elizaos", name: "eliza", repoId: "elizaos/eliza" }`).
  - [x] Ensure existing configuration loading logic correctly parses the new structure.
  - [x] Update type definitions for `PipelineConfig` to reflect this change.
- [x] **Task 1.2: Update Core Pipeline Scripts for Iteration**
  - [x] Modify the `ingest` pipeline in `cli/analyze-pipeline.ts` (and its underlying modules in `src/lib/pipelines/ingest/`) to iterate over each configured repository.
    - [x] Pass the correct `repoId` (and owner/name if needed) to GitHub API calls and data processing functions.
  - [x] Modify the `process` pipeline in `cli/analyze-pipeline.ts` (and `src/lib/pipelines/process/`) to operate on data from all configured repositories, ensuring `repoId` is used for correct association.
  - [x] Modify the `export` pipeline in `cli/analyze-pipeline.ts` (and `src/lib/pipelines/export/`) to generate outputs for each repository, likely maintaining the `data/<owner_repo>/` structure.
- [x] **Task 1.3: Refactor User-Centric Pipelines for Aggregation**
  - **Goal:** Modify the user score, tag, and summary pipelines to aggregate data across all configured repositories, rather than calculating them on a per-repo basis.
  - [x] **1.3.1: Restructure Core Contributor Pipelines**
    - [x] In `src/lib/pipelines/contributors/index.ts`, change the main pipeline flow. Instead of iterating over repositories (`mapStep(processContributorTags)`), fetch all unique contributors from all configured repos first.
    - [x] Create a new `fetchAllContributorsFromAllRepos` step or modify `fetchAllContributors` to query users across all repos specified in the config.
    - [x] The `contributorsPipeline` should then iterate over the global list of unique users (`mapStep(processUser)`).
  - [x] **1.3.2: Update Scoring Logic for Aggregation**
    - [x] In `src/lib/pipelines/contributors/contributorScores.ts`, ensure `calculateUserScoreForInterval` is called once per user for each time interval.
    - [x] Modify the `queryParams` passed to `calculateContributorScore` to **omit** the `repository` field. This will cause it to query and aggregate a user's activities across all repositories.
    - [x] Confirm the `userDailyScores` table does **not** have a `repoId`, as scores are now global.
  - [x] **1.3.3: Update Tagging Logic for Aggregation**
    - [x] In `src/lib/pipelines/contributors/calculateTags.ts`, the `calculateTags` step must query a user's PRs from all repositories.
    - [x] Update the call to `getContributorPRs` to fetch data without a `repository` filter.
    - [x] Confirm the `userTagScores` table does **not** have a `repoId`.
  - [x] **1.3.4: Update Summarization Logic for Multi-Repo Context**
    - [x] In `src/lib/pipelines/summarize/queries.ts`, modify `getContributorMetrics` to aggregate data across all repositories when the `repository` parameter is not provided. The returned data structure should ideally group activities by repository to provide context to the next step.
    - [x] In `src/lib/pipelines/summarize/aiContributorSummary.ts`, update `formatContributorPrompt` to handle metrics from multiple repositories. The prompt must be updated to attribute each PR, issue, and activity to its source repository (e.g., `elizaos/eliza#123`, `elizaos-plugins/plugin-A#45`).
    - [x] Confirm the `userSummaries` table does **not** have a `repoId`.
- [ ] **Task 1.4: Verify Commit Deduplication**
  - [ ] Test the ingestion process with repositories that have shared commit history (if identifiable examples exist).
  - [ ] Confirm that commits with identical hashes are stored only once in `rawCommits` or are handled appropriately to avoid duplicate processing and scoring.
    - Investigate if `rawCommits.oid` (primary key) handles this naturally.
- [x] **Task 1.5: Basic Per-Repository Reporting/Summarization**
  - [x] Ensure the `summarize` pipeline (project summaries) can run for each configured repository and outputs to the correct `data/<owner_repo>/summaries/` directory.
  - [ ] Initial verification that existing website/UI components can (at a minimum) display data if pointed to a specific repository's output, or that per-repo pages can be generated. (Focus on data backend first).
- [ ] **Task 1.6: Update CLI Commands**
  - [ ] Review and update CLI command options in `cli/analyze-pipeline.ts` if necessary. For example, `--repository` flags might need to accept multiple values, or a new `--all-repos` flag might be introduced. Or, it might default to all repos in the config unless specified.
  - [ ] Update help messages and `README.md` for CLI changes.

## Phase 2: Enhanced Scoring and Aggregation

**Goal:** Develop strategies for viewing aggregated data (e.g., org-level) and explore more flexible scoring for a multi-repo context.

- [ ] **Task 2.1: Develop Aggregated View Strategies (Org-Level)**
  - [ ] Design how organization-level summaries or metrics could be calculated (e.g., total contributions to `elizaos` org).
  - [ ] Determine if new database tables or views are needed for storing/querying aggregated data.
  - [ ] Implement proof-of-concept for generating basic org-level statistics.
- [ ] **Task 2.2: Explore Flexible/Subjective Scoring Mechanisms**
  - [ ] Research and document potential approaches for allowing user-defined scoring weights (e.g., funders specifying weights for issue types, PR sizes, specific tags across selected repos).
  - [ ] Consider how `config/pipeline.config.ts` might be extended or if a new configuration mechanism/UI is needed for this.
  - [ ] Assess impact on `userTagScores` and `userDailyScores` if scores become more dynamic.
- [ ] **Task 2.3: Refine AI Summary Generation for Multi-Repo/Org Contexts**

  - [ ] Evaluate if the `projectContext` in `config/pipeline.config.ts` for AI summaries needs to be dynamic (e.g., different context per org, or a broader context for org-level summaries).
  - [ ] Test AI summary quality when summarizing activities across multiple repositories within an organization.
  - [ ] Adapt summarization prompts or logic in `src/lib/pipelines/summarize/` as needed.

- [ ] **Task 2.4: Implement Multi-Repo Project Summarization**
  - **Goal:** Refactor the project summary pipeline to support aggregated summaries across all configured repositories. See `plan/multi-repo-summaries.md` for the full plan.
  - [ ] **2.4.1: Refactor for Repo-Specific Summaries**
    - [ ] Rename `aiProjectSummary.ts` -> `aiRepoSummary.ts` and `generateProjectSummary.ts` -> `generateRepoSummary.ts`.
    - [ ] Update prompts and function names to reflect single-repo focus.
    - [ ] Implement optimization to only process repos with activity in a given interval.
  - [ ] **2.4.2: Implement Overall Daily Summary**
    - [ ] Create `aiOverallSummary.ts` and `generateOverallSummary.ts` modules.
    - [ ] Implement `getOverallProjectMetrics` to query data from all repos.
    - [ ] Create and implement the prompt for detailed daily summaries, grouping raw data by repo.
  - [ ] **2.4.3: Implement Overall Weekly/Monthly Summary**
    - [ ] Implement logic to first run the `repoSummariesPipeline` to get individual summaries.
    - [ ] Create and implement a prompt in `aiOverallSummary.ts` that synthesizes multiple repo summaries into a high-level overview.
  - [ ] **2.4.4: Database & Integration**
    - [ ] Add `overallSummaries` table to the database schema and create migrations.
    - [ ] Add mutation for storing overall summaries.
    - [ ] Update `summarize` pipeline entry point in `index.ts` and verify `cli/analyze-pipeline.ts` integration.
    - [ ] Ensure overall summary markdown files are saved to a new location (e.g., `data/summaries/`).

## Phase 3: Advanced Funder UX and LLM Integration

**Goal:** Improve the user experience for stakeholders (funders) by providing better tools for data exploration and leveraging LLMs for insights.

- [ ] **Task 3.1: Design and Implement Enhanced Funder UX**
  - [ ] Brainstorm and mock up UI features that allow funders to:
    - [ ] Easily switch between per-repo, per-org, and global views.
    - [ ] Filter and sort contributors/contributions based on various criteria (tags, activity types, date ranges across multiple repos).
    - [ ] Apply their subjective scoring/weighting (if implemented in Phase 2).
  - [ ] Implement frontend changes in `src/app/` and related components.
- [ ] **Task 3.2: Integrate LLMs for Advanced Data Querying/Interpretation**
  - [ ] Explore feasibility of using LLMs to answer natural language questions about the contribution data (e.g., "Show me top TypeScript contributors to elizaos-plugins this month").
  - [ ] Design and prototype a system for this, considering data context provision to the LLM.

## Cross-Cutting Concerns / To-Do Throughout

- [ ] **Testing:** Add unit and integration tests for multi-repo functionality.
- [ ] **Documentation:** Update `README.md`, `plan/multi-repo.md`, and any other relevant documentation.
- [ ] **Error Handling:** Ensure robust error handling for scenarios like invalid repo configurations, API errors for specific repos, etc.
- [ ] **Performance:** Monitor and optimize performance, especially during ingestion and processing of many repositories. Consider implications for `sqlite-diffable` and data sync.
- [ ] **GitHub Issue Creation:** Create corresponding GitHub issues for these tasks.
- [ ] **Branch Management:** Regularly merge changes from `main` to `multi-repo` and vice-versa as appropriate.
