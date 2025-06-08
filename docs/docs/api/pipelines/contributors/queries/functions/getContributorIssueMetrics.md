# Function: getContributorIssueMetrics()

> **getContributorIssueMetrics**(`username`, `params`): `Promise`\<\{ `closed`: `number`; `commentCount`: `number`; `open`: `number`; `total`: `number`; \}\>

Defined in: [src/lib/pipelines/contributors/queries.ts:79](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/contributors/queries.ts#L79)

Get aggregated issue metrics for a contributor

## Parameters

### username

`string`

### params

[`QueryParams`](../../../queryHelpers/interfaces/QueryParams.md) = `{}`

## Returns

`Promise`\<\{ `closed`: `number`; `commentCount`: `number`; `open`: `number`; `total`: `number`; \}\>
