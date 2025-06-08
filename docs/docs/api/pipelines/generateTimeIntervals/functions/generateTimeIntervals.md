# Function: generateTimeIntervals()

> **generateTimeIntervals**\<`TInput`\>(`intervalType`): [`PipelineStep`](../../types/type-aliases/PipelineStep.md)\<`TInput`, `TInput` & `object`[], [`RepoPipelineContext`](../../types/interfaces/RepoPipelineContext.md)\>

Defined in: [src/lib/pipelines/generateTimeIntervals.ts:14](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/generateTimeIntervals.ts#L14)

Creates a pipeline step to generate time intervals for a repository with a specific interval type

## Type Parameters

### TInput

`TInput` _extends_ `Record`\<`string`, `unknown`\>

## Parameters

### intervalType

`IntervalType`

## Returns

[`PipelineStep`](../../types/type-aliases/PipelineStep.md)\<`TInput`, `TInput` & `object`[], [`RepoPipelineContext`](../../types/interfaces/RepoPipelineContext.md)\>
