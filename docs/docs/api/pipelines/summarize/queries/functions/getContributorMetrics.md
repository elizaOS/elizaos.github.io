# Function: getContributorMetrics()

> **getContributorMetrics**(`__namedParameters`): `Promise`\<\{ `activityPattern`: \{ `daysActive`: `number`; `frequency`: `number`; `totalDays`: `number`; \}; `codeChanges`: \{ `additions`: `number`; `commitCount`: `number`; `commitTypes`: \{ `bugfix`: `number`; `docs`: `number`; `feature`: `number`; `other`: `number`; `refactor`: `number`; `tests`: `number`; \}; `deletions`: `number`; `files`: `number`; \}; `comments`: \{ `issueComments`: `number`; `prComments`: `number`; `total`: `number`; \}; `focusAreas`: `object`[]; `issues`: \{ `closed`: `number`; `commented`: `number`; `items`: `object`[]; `opened`: `number`; `total`: `number`; \}; `pullRequests`: \{ `fileTypes`: \{ `code`: `number`; `config`: `number`; `docs`: `number`; `other`: `number`; `tests`: `number`; \}; `items`: `object`[]; `merged`: `number`; `metrics`: \{ `avgAdditions`: `number`; `avgDeletions`: `number`; `avgTimeToMerge`: `number`; `largestPR`: \{ `additions`: `number`; `deletions`: `number`; `number`: `number`; `title`: `string`; \}; \}; `open`: `number`; `total`: `number`; \}; `repository`: `undefined` \| `string`; `reviews`: \{ `approved`: `number`; `changesRequested`: `number`; `commented`: `number`; `items`: `object`[]; `total`: `number`; \}; `username`: `string`; \}\>

Defined in: [src/lib/pipelines/summarize/queries.ts:25](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/summarize/queries.ts#L25)

Get metrics for a contributor within a time range

## Parameters

### \_\_namedParameters

#### dateRange

\{ `endDate`: `string`; `startDate`: `string`; \}

#### dateRange.endDate

`string`

#### dateRange.startDate

`string`

#### repository

`undefined` \| `string`

#### username

`string`

## Returns

`Promise`\<\{ `activityPattern`: \{ `daysActive`: `number`; `frequency`: `number`; `totalDays`: `number`; \}; `codeChanges`: \{ `additions`: `number`; `commitCount`: `number`; `commitTypes`: \{ `bugfix`: `number`; `docs`: `number`; `feature`: `number`; `other`: `number`; `refactor`: `number`; `tests`: `number`; \}; `deletions`: `number`; `files`: `number`; \}; `comments`: \{ `issueComments`: `number`; `prComments`: `number`; `total`: `number`; \}; `focusAreas`: `object`[]; `issues`: \{ `closed`: `number`; `commented`: `number`; `items`: `object`[]; `opened`: `number`; `total`: `number`; \}; `pullRequests`: \{ `fileTypes`: \{ `code`: `number`; `config`: `number`; `docs`: `number`; `other`: `number`; `tests`: `number`; \}; `items`: `object`[]; `merged`: `number`; `metrics`: \{ `avgAdditions`: `number`; `avgDeletions`: `number`; `avgTimeToMerge`: `number`; `largestPR`: \{ `additions`: `number`; `deletions`: `number`; `number`: `number`; `title`: `string`; \}; \}; `open`: `number`; `total`: `number`; \}; `repository`: `undefined` \| `string`; `reviews`: \{ `approved`: `number`; `changesRequested`: `number`; `commented`: `number`; `items`: `object`[]; `total`: `number`; \}; `username`: `string`; \}\>
