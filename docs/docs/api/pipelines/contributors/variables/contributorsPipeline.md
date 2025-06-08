# Variable: contributorsPipeline

> `const` **contributorsPipeline**: [`PipelineStep`](../../types/type-aliases/PipelineStep.md)\<`Record`\<`string`, `unknown`\>, \[(`null` \| \{ `numPrsProcessed`: `number`; `tagCount`: `number`; `topAreas`: `string`; \})[][], (`null` \| \{ `activeCount`: `number`; `date`: `string`; `interval`: `TimeInterval`; `intervalType`: `IntervalType`; `processedCount`: `number`; `results`: `object`[]; `totalCount`: `number`; \})[]\], [`ContributorPipelineContext`](../context/interfaces/ContributorPipelineContext.md)\>

Defined in: [src/lib/pipelines/contributors/index.ts:54](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/contributors/index.ts#L54)

Pipeline for calculating all contributor data across repositories
