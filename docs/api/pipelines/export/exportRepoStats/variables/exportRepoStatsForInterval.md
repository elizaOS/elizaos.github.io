# Variable: exportRepoStatsForInterval

> `const` **exportRepoStatsForInterval**: [`PipelineStep`](../../../types/type-aliases/PipelineStep.md)\<\{ `interval`: `TimeInterval`; `repoId`: `string`; \}, `undefined` \| \{ `activeContributors`: `number`; `closedIssues`: `number`; `codeChanges`: \{ `additions`: `number`; `commitCount`: `number`; `deletions`: `number`; `files`: `number`; \}; `completedItems`: `object`[]; `interval`: `TimeInterval`; `mergedPRs`: `number`; `newIssues`: `number`; `newPRs`: `number`; `overview`: `string`; `repository`: `string`; `topContributors`: `object`[]; `topIssues`: `object`[]; `topPRs`: `object`[]; \}, [`RepositoryStatsPipelineContext`](../../context/interfaces/RepositoryStatsPipelineContext.md)\>

Defined in: [src/lib/pipelines/export/exportRepoStats.ts:17](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/export/exportRepoStats.ts#L17)

Generate stats for a specific time interval
