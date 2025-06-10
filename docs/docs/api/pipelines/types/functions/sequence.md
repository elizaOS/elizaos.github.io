# Function: sequence()

## Call Signature

> **sequence**\<`TInput`, `T1`, `T2`, `TContext`\>(`op1`, `op2`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, \[`T1`, `T2`\], `TContext`\>

Defined in: [src/lib/pipelines/types.ts:120](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L120)

Execute multiple pipeline steps sequentially with the same input and combine their results

### Type Parameters

#### TInput

`TInput`

#### T1

`T1`

#### T2

`T2`

#### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

### Parameters

#### op1

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `T1`, `TContext`\>

#### op2

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `T2`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, \[`T1`, `T2`\], `TContext`\>

## Call Signature

> **sequence**\<`TInput`, `T1`, `T2`, `T3`, `TContext`\>(`op1`, `op2`, `op3`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, \[`T1`, `T2`, `T3`\], `TContext`\>

Defined in: [src/lib/pipelines/types.ts:125](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L125)

Execute multiple pipeline steps sequentially with the same input and combine their results

### Type Parameters

#### TInput

`TInput`

#### T1

`T1`

#### T2

`T2`

#### T3

`T3`

#### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

### Parameters

#### op1

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `T1`, `TContext`\>

#### op2

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `T2`, `TContext`\>

#### op3

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, `T3`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`TInput`, \[`T1`, `T2`, `T3`\], `TContext`\>
