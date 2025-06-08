# Function: pipe()

## Call Signature

> **pipe**\<`T1`, `T2`, `TContext`\>(`op1`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

Defined in: [src/lib/pipelines/types.ts:51](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L51)

Pipe operations together, feeding output of one step to input of the next

### Type Parameters

#### T1

`T1`

#### T2

`T2`

#### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

### Parameters

#### op1

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

## Call Signature

> **pipe**\<`T1`, `T2`, `T3`, `TContext`\>(`op1`, `op2`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T3`, `TContext`\>

Defined in: [src/lib/pipelines/types.ts:55](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L55)

Pipe operations together, feeding output of one step to input of the next

### Type Parameters

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

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

#### op2

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T2`, `T3`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T3`, `TContext`\>

## Call Signature

> **pipe**\<`T1`, `T2`, `T3`, `T4`, `TContext`\>(`op1`, `op2`, `op3`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T4`, `TContext`\>

Defined in: [src/lib/pipelines/types.ts:60](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L60)

Pipe operations together, feeding output of one step to input of the next

### Type Parameters

#### T1

`T1`

#### T2

`T2`

#### T3

`T3`

#### T4

`T4`

#### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

### Parameters

#### op1

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

#### op2

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T2`, `T3`, `TContext`\>

#### op3

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T3`, `T4`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T4`, `TContext`\>

## Call Signature

> **pipe**\<`T1`, `T2`, `T3`, `T4`, `T5`, `TContext`\>(`op1`, `op2`, `op3`, `op4`): [`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T5`, `TContext`\>

Defined in: [src/lib/pipelines/types.ts:66](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L66)

Pipe operations together, feeding output of one step to input of the next

### Type Parameters

#### T1

`T1`

#### T2

`T2`

#### T3

`T3`

#### T4

`T4`

#### T5

`T5`

#### TContext

`TContext` _extends_ [`BasePipelineContext`](../interfaces/BasePipelineContext.md)

### Parameters

#### op1

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T2`, `TContext`\>

#### op2

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T2`, `T3`, `TContext`\>

#### op3

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T3`, `T4`, `TContext`\>

#### op4

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T4`, `T5`, `TContext`\>

### Returns

[`PipelineStep`](../type-aliases/PipelineStep.md)\<`T1`, `T5`, `TContext`\>
