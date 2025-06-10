# Function: createStep()

> **createStep**\<`TInput`, `TOutput`, `TContext`\>(`name`, `transform`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `TOutput`, `TContext`\>

Defined in: [src/lib/pipelines/types.ts:173](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L173)

Create a typed pipeline step

## Type Parameters

### TInput

`TInput`

### TOutput

`TOutput`

### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md) = [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

## Parameters

### name

`string`

### transform

(`input`, `context`) => `TOutput` \| `Promise`\<`TOutput`\>

## Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `TOutput`, `TContext`\>
