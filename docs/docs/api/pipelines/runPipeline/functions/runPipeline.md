# Function: runPipeline()

> **runPipeline**\<`TInput`, `TOutput`, `TContext`\>(`pipeline`, `input`, `context`): `Promise`\<`TOutput`\>

Defined in: [src/lib/pipelines/runPipeline.ts:7](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/runPipeline.ts#L7)

Pipeline runner - executes a pipeline with config

## Type Parameters

### TInput

`TInput`

### TOutput

`TOutput`

### TContext

`TContext` _extends_ [`BasePipelineContext`](../../types/interfaces/BasePipelineContext.md)

## Parameters

### pipeline

[`PipelineStep`](../../types/type-aliases/PipelineStep.md)\<`TInput`, `TOutput`, `TContext`\>

### input

`TInput`

### context

`TContext`

## Returns

`Promise`\<`TOutput`\>
