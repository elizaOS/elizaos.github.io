# Function: buildCommonWhereConditions()

> **buildCommonWhereConditions**\<`T`\>(`params`, `table`, `dateFields`): `SQL`\<`unknown`\>[]

Defined in: [src/lib/pipelines/queryHelpers.ts:52](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/queryHelpers.ts#L52)

Helper function to build common where conditions based on query params

## Type Parameters

### T

`T` _extends_ `AnySQLiteTable`

## Parameters

### params

[`QueryParams`](../interfaces/QueryParams.md)

### table

`T`

### dateFields

keyof `T`[]

## Returns

`SQL`\<`unknown`\>[]
