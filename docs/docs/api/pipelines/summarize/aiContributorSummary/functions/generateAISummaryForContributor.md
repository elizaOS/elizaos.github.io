# Function: generateAISummaryForContributor()

> **generateAISummaryForContributor**(`metrics`, `config`, `intervalType`): `Promise`\<`null` \| `string`\>

Defined in: [src/lib/pipelines/summarize/aiContributorSummary.ts:13](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/summarize/aiContributorSummary.ts#L13)

Generate an AI summary of a contributor's activity

## Parameters

### metrics

#### activityPattern

\{ `daysActive`: `number`; `frequency`: `number`; `totalDays`: `number`; \} = `...`

#### activityPattern.daysActive

`number` = `uniqueDaysWithCommits`

#### activityPattern.frequency

`number` = `commitFrequency`

#### activityPattern.totalDays

`number`

#### codeChanges

\{ `additions`: `number`; `commitCount`: `number`; `commitTypes`: \{ `bugfix`: `number`; `docs`: `number`; `feature`: `number`; `other`: `number`; `refactor`: `number`; `tests`: `number`; \}; `deletions`: `number`; `files`: `number`; \} = `...`

#### codeChanges.additions

`number`

#### codeChanges.commitCount

`number` = `contributorCommits.length`

#### codeChanges.commitTypes

\{ `bugfix`: `number`; `docs`: `number`; `feature`: `number`; `other`: `number`; `refactor`: `number`; `tests`: `number`; \}

#### codeChanges.commitTypes.bugfix

`number` = `0`

#### codeChanges.commitTypes.docs

`number` = `0`

#### codeChanges.commitTypes.feature

`number` = `0`

#### codeChanges.commitTypes.other

`number` = `0`

#### codeChanges.commitTypes.refactor

`number` = `0`

#### codeChanges.commitTypes.tests

`number` = `0`

#### codeChanges.deletions

`number`

#### codeChanges.files

`number`

#### comments

\{ `issueComments`: `number`; `prComments`: `number`; `total`: `number`; \} = `...`

#### comments.issueComments

`number` = `issueInteractions.length`

#### comments.prComments

`number` = `prCommentData.length`

#### comments.total

`number` = `...`

#### focusAreas

`object`[]

#### issues

\{ `closed`: `number`; `commented`: `number`; `items`: `object`[]; `opened`: `number`; `total`: `number`; \} = `...`

#### issues.closed

`number` = `closedIssues.length`

#### issues.commented

`number` = `issueInteractions.length`

#### issues.items

`object`[] = `contributorIssues`

#### issues.opened

`number` = `contributorIssues.length`

#### issues.total

`number` = `contributorIssues.length`

#### pullRequests

\{ `fileTypes`: \{ `code`: `number`; `config`: `number`; `docs`: `number`; `other`: `number`; `tests`: `number`; \}; `items`: `object`[]; `merged`: `number`; `metrics`: \{ `avgAdditions`: `number`; `avgDeletions`: `number`; `avgTimeToMerge`: `number`; `largestPR`: \{ `additions`: `number`; `deletions`: `number`; `number`: `number`; `title`: `string`; \}; \}; `open`: `number`; `total`: `number`; \} = `...`

#### pullRequests.fileTypes

\{ `code`: `number`; `config`: `number`; `docs`: `number`; `other`: `number`; `tests`: `number`; \} = `fileTypeAnalysis`

#### pullRequests.fileTypes.code

`number` = `0`

#### pullRequests.fileTypes.config

`number` = `0`

#### pullRequests.fileTypes.docs

`number` = `0`

#### pullRequests.fileTypes.other

`number` = `0`

#### pullRequests.fileTypes.tests

`number` = `0`

#### pullRequests.items

`object`[] = `prs`

#### pullRequests.merged

`number` = `mergedPRs.length`

#### pullRequests.metrics

\{ `avgAdditions`: `number`; `avgDeletions`: `number`; `avgTimeToMerge`: `number`; `largestPR`: \{ `additions`: `number`; `deletions`: `number`; `number`: `number`; `title`: `string`; \}; \} = `prMetrics`

#### pullRequests.metrics.avgAdditions

`number` = `0`

#### pullRequests.metrics.avgDeletions

`number` = `0`

#### pullRequests.metrics.avgTimeToMerge

`number` = `0`

#### pullRequests.metrics.largestPR

\{ `additions`: `number`; `deletions`: `number`; `number`: `number`; `title`: `string`; \} = `...`

#### pullRequests.metrics.largestPR.additions

`number` = `0`

#### pullRequests.metrics.largestPR.deletions

`number` = `0`

#### pullRequests.metrics.largestPR.number

`number` = `0`

#### pullRequests.metrics.largestPR.title

`string` = `""`

#### pullRequests.open

`number` = `openPRs.length`

#### pullRequests.total

`number` = `prs.length`

#### repository

`undefined` \| `string`

#### reviews

\{ `approved`: `number`; `changesRequested`: `number`; `commented`: `number`; `items`: `object`[]; `total`: `number`; \} = `...`

#### reviews.approved

`number`

#### reviews.changesRequested

`number`

#### reviews.commented

`number`

#### reviews.items

`object`[] = `contributorReviews`

#### reviews.total

`number` = `contributorReviews.length`

#### username

`string`

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

### intervalType

`IntervalType`

## Returns

`Promise`\<`null` \| `string`\>
