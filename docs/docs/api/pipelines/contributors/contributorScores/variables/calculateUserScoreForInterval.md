# Variable: calculateUserScoreForInterval

> `const` **calculateUserScoreForInterval**: [`PipelineStep`](../../../types/type-aliases/PipelineStep.md)\<\{ `interval`: `TimeInterval`; `username`: `string`; \}, `null` \| \{ `date`: `string`; `intervalType`: `IntervalType`; `score`: `number`; `username`: `string`; \}, [`ContributorPipelineContext`](../../context/interfaces/ContributorPipelineContext.md)\>

Defined in: [src/lib/pipelines/contributors/contributorScores.ts:11](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/contributors/contributorScores.ts#L11)

Calculate and save scores for a contributor within a time interval
