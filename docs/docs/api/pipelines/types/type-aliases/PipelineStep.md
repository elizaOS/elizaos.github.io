# Type Alias: PipelineStep()\<TInput, TOutput, TContext\>

> **PipelineStep**\<`TInput`, `TOutput`, `TContext`\> = (`input`, `context`) => `Promise`\<`TOutput`\> \| `TOutput`

Defined in: [src/lib/pipelines/types.ts:40](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L40)

A pipeline step/operation that transforms data with typed context

## Type Parameters

### TInput

`TInput`

### TOutput

`TOutput`

### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md) = [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

## Parameters

### input

`TInput`

### context

`TContext`

## Returns

`Promise`\<`TOutput`\> \| `TOutput`
