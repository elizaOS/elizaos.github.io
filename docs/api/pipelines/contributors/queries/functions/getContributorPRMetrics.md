# Function: getContributorPRMetrics()

> **getContributorPRMetrics**(`username`, `params`): `Promise`\<\{ `additions`: `number`; `changedFiles`: `number`; `closed`: `number`; `deletions`: `number`; `merged`: `number`; `open`: `number`; `total`: `number`; \}\>

Defined in: [src/lib/pipelines/contributors/queries.ts:42](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/contributors/queries.ts#L42)

Get aggregated pull request metrics for a contributor

## Parameters

### username

`string`

### params

[`QueryParams`](../../../queryHelpers/interfaces/QueryParams.md) = `{}`

## Returns

`Promise`\<\{ `additions`: `number`; `changedFiles`: `number`; `closed`: `number`; `deletions`: `number`; `merged`: `number`; `open`: `number`; `total`: `number`; \}\>
