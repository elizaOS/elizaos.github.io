# Multi-Repository Support Plan

This document outlines the considerations and challenges for extending the Eliza Leaderboard analytics pipeline to support multiple repositories, including those from the `elizaos` and `elizaos-plugins` organizations.

## 1. Goals

- Integrate all repositories from the `elizaos` organization.
- Integrate all repositories from the `elizaos-plugins` organization.
- Provide a comprehensive view of contributions across these entities.
- Ensure data accuracy, especially with potentially shared commit histories.
- Develop flexible scoring and summarization mechanisms suitable for a multi-repo, multi-org context.

## 2. Key Challenges and Considerations

### 2.1. Data Ingestion and Processing

- **Repository Configuration:**
  - How to efficiently manage a list of repositories from different owners/orgs in [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts) or a similar configuration mechanism.
  - Scalability of ingesting data from a potentially large number of repositories.
- **Commit Deduplication:**
  - Address the scenario of shared commit histories between repositories (e.g., forked repositories, submodules, or vendored code).
  - Leverage commit hashes for deduplication. If commit hashes match, it should be straightforward. Need to confirm this is sufficient for all cases.
- **Data Storage:**

  - How will data from multiple repositories be structured in the database? (See schema: [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts))
  - Will there be separate tables or a way to distinguish data per repository within existing tables?
  - Consider the impact on `data/dump/` and the `sqlite-diffable` process mentioned in the [`README.md`](https://github.com/elizaos/elizaos.github.io/blob/main/README.md#data-management-architecture).
  - **Current Schema Relevant Snippet (from [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts)):**

    ```typescript
    // Repositories being tracked
    export const repositories = sqliteTable("repositories", {
      repoId: text("repo_id").primaryKey(), // Likely 'owner/name'
      lastFetchedAt: text("last_fetched_at").default(""),
      // ...
    });

    // Example from raw data table
    export const rawPullRequests = sqliteTable("raw_pull_requests", {
      id: text("id").primaryKey(),
      // ...
      repository: text("repository").notNull(), // Foreign key to repositories.repoId
      // ...
    });

    // Example from processed data (repo-specific)
    export const repoSummaries = sqliteTable("repo_summaries", {
      id: text("id").primaryKey(), // repo_id_intervalType_date
      repoId: text("repo_id").notNull(), // Links to repositories.repoId
      // ...
    });

    // User-centric tables like userSummaries and userDailyScores
    // currently do not have a direct repoId.
    // Aggregation across repos or per-repo views for users would
    // require joins or schema modification.
    ```

  - **Type Definitions for Ingestion (from [src/lib/data/types.ts](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/types.ts)):**
    The system uses Zod schemas in `src/lib/data/types.ts` to define the expected structure of raw data fetched from GitHub (e.g., `RawPullRequestSchema`, `RawIssueSchema`). These schemas represent the data structure _before_ it's mapped to the database tables and are crucial for the ingestion process.
    ```typescript
    // Example: Simplified Zod schema for a Raw Pull Request
    export const RawPullRequestSchema = z.object({
      id: z.string(),
      number: z.number(),
      title: z.string(),
      // ... other PR fields ...
      author: GithubUserSchema.nullable().optional(),
      // Note: These raw types do not inherently contain a 'repository' field.
      // The association is typically handled by the ingestion logic processing data for a specific repo.
    });
    ```

### 2.2. Data Presentation and Summarization

- **Scope of Summaries:**
  - Should summaries (daily, weekly, monthly) be generated per-repository, per-organization, or provide an aggregated view? (Current summarization logic entry point: [`cli/analyze-pipeline.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/cli/analyze-pipeline.ts) with `summarize` command)
  - User interface implications for presenting data from multiple repositories/organizations. (Frontend entry: [`src/app/`](https://github.com/elizaos/elizaos.github.io/tree/main/src/app/))
  - How will AI-powered summaries handle context from multiple sources? (AI config in [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts#L361-L386))
- **Contributor Profiles:**
  - How will contributor profiles reflect activity across multiple repositories and organizations? (Current profiles likely generated based on data in `userDailyScores`, `userTagScores` from [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts))
  - Will expertise and focus areas be aggregated or shown per-repository/org?

### 2.3. Scoring and Leaderboards

- **Leaderboard Structure:**
  - Single global leaderboard vs. per-repository leaderboards vs. per-organization leaderboards.
  - Potential for custom or thematic leaderboards (e.g., "Top Plugin Contributors").
- **Score Normalization and Fairness:**
  - The challenge of creating a "fair" universal scoring system across diverse repositories with different contribution patterns, sizes, and complexities.
  - As noted, a single universal score might not be ideal. The system should aim for "credibly neutral" metrics.
- **User-Subjective Scoring:**
  - Explore mechanisms for funders/users to define their own scoring weights and priorities.
  - The pipeline should provide raw, objective data points that can then be synthesized and weighted subjectively.
  - This makes the scoring algorithm less "gameable" as it's not a fixed, published formula but rather a flexible interpretation by the consumer of the data.
- **Impact on Existing Scoring Logic:**
  - Review current scoring rules in [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts#L19-L214) (`pullRequest`, `issue`, `review`, `comment`, `codeChange`, `tags`) and assess their applicability or need for adaptation in a multi-repo context.

### 2.4. User Experience (UX) for Funders/Stakeholders

- **Data Synthesis and Exploration:**
  - How can the system help funders easily understand and synthesize the raw contribution data?
  - Develop UX mechanisms that allow funders to "hone in" on specific types of contributions or areas they wish to support.
- **Role of LLMs:**
  - Leverage LLMs to assist funders in interpreting data, generating custom reports, or identifying key contributors based on specific criteria.
  - LLMs could power natural language queries over the contribution data.

### 2.5. Technical Implementation

- **Configuration Updates:**
  - Modify [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts#L10-L16) to accept a list of repositories with owner information.
  - Example:
    ```typescript
    repositories: [
      { owner: "elizaos", name: "eliza", repoId: "elizaos/eliza" },
      { owner: "elizaos", name: "another-repo", repoId: "elizaos/another-repo" },
      { owner: "elizaos-plugins", name: "plugin-alpha", repoId: "elizaos-plugins/plugin-alpha" },
    ],
    ```
- **Pipeline Adjustments:**
  - Update ingestion, processing, export, and summarization pipelines (entry point: [`cli/analyze-pipeline.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/cli/analyze-pipeline.ts)) to iterate over the configured repositories.
  - Ensure `repoId` (e.g., `owner/name`) is used consistently for data segregation and linking.
- **Database Schema:**
  - Potentially add `repository_owner` and `repository_name` fields to relevant tables or ensure existing `repoId` is sufficient in [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts).
  - Assess impact on foreign key relationships and queries.
- **API and Data Access:**
  - If a public API is planned (as mentioned in [`src/app/about/page.tsx`](https://github.com/elizaos/elizaos.github.io/blob/main/src/app/about/page.tsx#L207)), consider how it will handle multi-repo data queries.

## 3. Current System Analysis (Relevant Points)

- **[`pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts):** Currently configured for a single repository object (`elizaos/eliza`). This will need to be generalized.
- **[`README.md`](https://github.com/elizaos/elizaos.github.io/blob/main/README.md):** Describes pipeline commands (`ingest`, `process`, `export`, `summarize`) which currently operate on a global or single-repo basis. These commands will need options to specify target repositories or organizations.
- **Scoring ([`pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts)):** The scoring system is detailed but not inherently designed for cross-repo normalization.
- **AI Summaries:** Configured with `projectContext` in [`pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts). This context might need to be dynamic or broader if summarizing across an entire organization.
- **Data Output:** JSON files and static profiles are generated. The structure of `data/<owner_repo>/` is already suitable for multi-repo, provided `owner_repo` is unique (e.g., `elizaos_eliza`, `elizaos-plugins_myplugin`). The schema for this can be found in [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts).

## 4. Proposed Phases / Next Steps

1.  **Phase 1: Foundational Multi-Repo Support**
    - Modify `pipeline.config.ts` to accept a list of repositories with owner/name.
    - Update core pipeline scripts ([`cli/analyze-pipeline.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/cli/analyze-pipeline.ts) for `ingest`, `process`, `export`) to loop through configured repositories.
    - Ensure basic data segregation in storage (e.g., file paths like `data/<owner_repo>/`, database schema adjustments in [`src/lib/data/schema.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/src/lib/data/schema.ts)).
    - Verify commit deduplication (initial focus on matching commit hashes).
    - Basic per-repository reporting/summarization (output to `data/<owner_repo>/` and potentially new UI views in [`src/app/`](https://github.com/elizaos/elizaos.github.io/tree/main/src/app/)).
2.  **Phase 2: Enhanced Scoring and Aggregation**
    - Develop strategies for aggregated views (org-level).
    - Explore initial ideas for flexible/subjective scoring mechanisms (logic likely in [`src/lib/pipelines/process/`](https://github.com/elizaos/elizaos.github.io/tree/main/src/lib/pipelines/process/) and configured in [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts)).
    - Refine AI summary generation for multi-repo contexts (logic in [`src/lib/pipelines/summarize/`](https://github.com/elizaos/elizaos.github.io/tree/main/src/lib/pipelines/summarize/) and configured in [`config/pipeline.config.ts`](https://github.com/elizaos/elizaos.github.io/blob/main/config/pipeline.config.ts)).
3.  **Phase 3: Advanced Funder UX and LLM Integration**
    - Design and implement UX features for funders to explore and synthesize data.
    - Integrate LLMs for advanced data querying and interpretation.

## 5. Open Questions

- What is the exact definition of "shared history" beyond identical commit hashes? Are there scenarios like cherry-picked commits with different hashes but identical changes that need consideration? (Lead dev asked for examples).
- How should "organization-wide" summaries be structured? What are the key insights to extract at that level?
- What are the specific needs of funders regarding subjective scoring? What parameters would they want to control?
- Are there performance implications for ingesting and processing a significantly larger number of repositories?

---

_This document will be updated as discussions progress and solutions are developed._
