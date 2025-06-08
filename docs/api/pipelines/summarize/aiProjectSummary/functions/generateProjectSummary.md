# Function: generateProjectSummary()

> **generateProjectSummary**(`metrics`, `config`, `dateInfo`, `intervalType`): `Promise`\<`null` \| `string`\>

Defined in: [src/lib/pipelines/summarize/aiProjectSummary.ts:60](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/summarize/aiProjectSummary.ts#L60)

## Parameters

### metrics

#### codeChanges

\{ `additions`: `number`; `commitCount`: `number`; `deletions`: `number`; `files`: `number`; \}

#### codeChanges.additions

`number`

#### codeChanges.commitCount

`number` = `commits.length`

#### codeChanges.deletions

`number`

#### codeChanges.files

`number` = `filesChangedThisPeriod.length`

#### completedItems

`object`[]

#### focusAreas

`object`[]

#### issues

\{ `closedIssues`: `object`[]; `newIssues`: `object`[]; \}

#### issues.closedIssues

`object`[]

#### issues.newIssues

`object`[]

#### pullRequests

\{ `mergedPRs`: `object`[]; `newPRs`: `object`[]; \}

#### pullRequests.mergedPRs

`object`[] = `mergedPRsThisPeriod`

#### pullRequests.newPRs

`object`[] = `createdPRs`

#### repository

`undefined` \| `string`

#### topContributors

`object`[]

#### uniqueContributors

`number`

### config

#### apiKey

`string` = `...`

#### defaultModel

`string` = `...`

#### enabled

`boolean` = `...`

#### endpoint

`string` = `...`

#### max_tokens

`number` = `...`

#### models

\{ `day`: `string`; `month`: `string`; `week`: `string`; \} = `...`

#### models.day

`string` = `...`

#### models.month

`string` = `...`

#### models.week

`string` = `...`

#### projectContext

`string` = `...`

#### temperature

`number` = `...`

### dateInfo

#### startDate

`string`

### intervalType

`IntervalType`

## Returns

`Promise`\<`null` \| `string`\>
