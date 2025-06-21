# Function: getContributorReviewMetrics()

> **getContributorReviewMetrics**(`username`, `params`): `Promise`\<\{ `approved`: `number`; `changesRequested`: `number`; `commented`: `number`; `total`: `number`; \}\>

Defined in: [src/lib/pipelines/contributors/queries.ts:120](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/contributors/queries.ts#L120)

Get aggregated review metrics for a contributor

## Parameters

### username

`string`

### params

[`QueryParams`](../../../queryHelpers/interfaces/QueryParams.md) = `{}`

## Returns

`Promise`\<\{ `approved`: `number`; `changesRequested`: `number`; `commented`: `number`; `total`: `number`; \}\>
