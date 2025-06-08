# Function: mapStep()

> **mapStep**\<`TInput`, `TOutput`, `TContext`\>(`operation`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`[], `TOutput`[], `TContext`\>

Defined in: [src/lib/pipelines/types.ts:154](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L154)

Map a pipeline step over an array of inputs

## Type Parameters

### TInput

`TInput`

### TOutput

`TOutput`

### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

## Parameters

### operation

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `TOutput`, `TContext`\>

## Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`[], `TOutput`[], `TContext`\>
