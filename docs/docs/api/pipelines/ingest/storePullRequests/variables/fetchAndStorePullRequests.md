# Variable: fetchAndStorePullRequests

> `const` **fetchAndStorePullRequests**: [`PipelineStep`](../../../types/type-aliases/PipelineStep.md)\<\{ `repository`: \{ `defaultBranch`: `string`; `repoId`: `string`; \}; \}, \{ `count`: `number`; `repository`: \{ `defaultBranch`: `string`; `repoId`: `string`; \}; \}, [`IngestionPipelineContext`](../../context/interfaces/IngestionPipelineContext.md)\>

Defined in: [src/lib/pipelines/ingest/storePullRequests.ts:25](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/ingest/storePullRequests.ts#L25)

Step to fetch and store pull requests for a repository
