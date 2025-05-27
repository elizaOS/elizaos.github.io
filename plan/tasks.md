# Multi-Repository Support Implementation Tasks

This document breaks down the implementation tasks for adding multi-repository support to the Eliza Leaderboard, based on the phases outlined in `plan/multi-repo.md`.

## Phase 1: Foundational Multi-Repo Support

**Goal:** Enable the pipeline to ingest, process, and store data from multiple configured repositories, with basic per-repository output.

- [ ] **Task 1.1: Modify `pipeline.config.ts` Structure**
  - [ ] Update the `repositories` array in `config/pipeline.config.ts` to accept objects containing `owner`, `name`, and `repoId` (e.g., `{ owner: "elizaos", name: "eliza", repoId: "elizaos/eliza" }`).
  - [ ] Ensure existing configuration loading logic correctly parses the new structure.
  - [ ] Update type definitions for `PipelineConfig` to reflect this change.
- [ ] **Task 1.2: Update Core Pipeline Scripts for Iteration**
  - [ ] Modify the `ingest` pipeline in `cli/analyze-pipeline.ts` (and its underlying modules in `src/lib/pipelines/ingest/`) to iterate over each configured repository.
    - [ ] Pass the correct `repoId` (and owner/name if needed) to GitHub API calls and data processing functions.
  - [ ] Modify the `process` pipeline in `cli/analyze-pipeline.ts` (and `src/lib/pipelines/process/`) to operate on data from all configured repositories, ensuring `repoId` is used for correct association.
  - [ ] Modify the `export` pipeline in `cli/analyze-pipeline.ts` (and `src/lib/pipelines/export/`) to generate outputs for each repository, likely maintaining the `data/<owner_repo>/` structure.
- [ ] **Task 1.3: Ensure Data Segregation**
  - [ ] **Database:** Confirm that all database interactions (inserts, updates, queries) in Drizzle ORM correctly use the `repoId` (or equivalent `repository` field) to associate data with the correct repository (ref: `src/lib/data/schema.ts`).
    - [ ] Verify `repositories` table is populated correctly for each new repo.
    - [ ] Verify raw data tables (`rawPullRequests`, `rawIssues`, etc.) correctly link to `repositories.repoId`.
  - [ ] **File System:** Confirm that file-based outputs (JSON summaries, logs if any) are correctly placed in per-repository directories (e.g., `data/elizaos_eliza/`, `data/elizaos-plugins_myplugin/`).
- [ ] **Task 1.4: Verify Commit Deduplication**
  - [ ] Test the ingestion process with repositories that have shared commit history (if identifiable examples exist).
  - [ ] Confirm that commits with identical hashes are stored only once in `rawCommits` or are handled appropriately to avoid duplicate processing and scoring.
    - Investigate if `rawCommits.oid` (primary key) handles this naturally.
- [ ] **Task 1.5: Basic Per-Repository Reporting/Summarization**
  - [ ] Ensure the `summarize` pipeline (project summaries) can run for each configured repository and outputs to the correct `data/<owner_repo>/summaries/` directory.
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
