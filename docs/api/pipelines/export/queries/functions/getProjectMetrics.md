# Function: getProjectMetrics()

> **getProjectMetrics**(`params`): `Promise`\<\{ `codeChanges`: \{ `additions`: `number`; `commitCount`: `number`; `deletions`: `number`; `files`: `number`; \}; `completedItems`: `object`[]; `focusAreas`: `object`[]; `issues`: \{ `closedIssues`: `object`[]; `newIssues`: `object`[]; \}; `pullRequests`: \{ `mergedPRs`: `object`[]; `newPRs`: `object`[]; \}; `repository`: `undefined` \| `string`; `topContributors`: `object`[]; `uniqueContributors`: `number`; \}\>

Defined in: [src/lib/pipelines/export/queries.ts:171](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/export/queries.ts#L171)

## Parameters

### params

[`QueryParams`](../../../queryHelpers/interfaces/QueryParams.md) = `{}`

## Returns

`Promise`\<\{ `codeChanges`: \{ `additions`: `number`; `commitCount`: `number`; `deletions`: `number`; `files`: `number`; \}; `completedItems`: `object`[]; `focusAreas`: `object`[]; `issues`: \{ `closedIssues`: `object`[]; `newIssues`: `object`[]; \}; `pullRequests`: \{ `mergedPRs`: `object`[]; `newPRs`: `object`[]; \}; `repository`: `undefined` \| `string`; `topContributors`: `object`[]; `uniqueContributors`: `number`; \}\>
