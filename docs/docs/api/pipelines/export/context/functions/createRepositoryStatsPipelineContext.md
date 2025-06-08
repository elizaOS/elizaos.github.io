# Function: createRepositoryStatsPipelineContext()

> **createRepositoryStatsPipelineContext**(`params`): [`RepositoryStatsPipelineContext`](../interfaces/RepositoryStatsPipelineContext.md)

Defined in: [src/lib/pipelines/export/context.ts:11](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/export/context.ts#L11)

Creates a repository stats export pipeline context

## Parameters

### params

#### config

\{ `aiSummary`: \{ `apiKey`: `string`; `defaultModel`: `string`; `enabled`: `boolean`; `endpoint`: `string`; `max_tokens`: `number`; `models`: \{ `day`: `string`; `month`: `string`; `week`: `string`; \}; `projectContext`: `string`; `temperature`: `number`; \}; `botUsers?`: `string`[]; `contributionStartDate?`: `string`; `repositories`: `object`[]; `scoring`: \{ `codeChange`: \{ `maxLines`: `number`; `perFile`: `number`; `perLineAddition`: `number`; `perLineDeletion`: `number`; `testCoverageBonus`: `number`; \}; `comment`: \{ `base`: `number`; `diminishingReturns`: `number`; `maxPerThread`: `number`; `substantiveMultiplier`: `number`; \}; `issue`: \{ `base`: `number`; `closedBonus`: `number`; `perComment`: `number`; `resolutionSpeedMultiplier`: `number`; `withLabelsMultiplier`: `Record`\<`string`, `number`\>; \}; `pullRequest`: \{ `base`: `number`; `closingIssueBonus`: `number`; `complexityMultiplier`: `number`; `descriptionMultiplier`: `number`; `maxPerDay`: `number`; `merged`: `number`; `optimalSizeBonus`: `number`; `perApproval`: `number`; `perComment`: `number`; `perReview`: `number`; \}; `reaction`: \{ `base`: `number`; `diminishingReturns`: `number`; `maxPerDay`: `number`; `received`: `number`; `types`: `Record`\<`string`, `number`\>; \}; `review`: \{ `approved`: `number`; `base`: `number`; `changesRequested`: `number`; `commented`: `number`; `detailedFeedbackMultiplier`: `number`; `maxPerDay`: `number`; `thoroughnessMultiplier`: `number`; \}; \}; `tags`: \{ `area`: `object`[]; `role`: `object`[]; `tech`: `object`[]; \}; \}

#### config.aiSummary

\{ `apiKey`: `string`; `defaultModel`: `string`; `enabled`: `boolean`; `endpoint`: `string`; `max_tokens`: `number`; `models`: \{ `day`: `string`; `month`: `string`; `week`: `string`; \}; `projectContext`: `string`; `temperature`: `number`; \} = `AISummaryConfigSchema`

#### config.aiSummary.apiKey

`string` = `...`

#### config.aiSummary.defaultModel

`string` = `...`

#### config.aiSummary.enabled

`boolean` = `...`

#### config.aiSummary.endpoint

`string` = `...`

#### config.aiSummary.max_tokens

`number` = `...`

#### config.aiSummary.models

\{ `day`: `string`; `month`: `string`; `week`: `string`; \} = `...`

#### config.aiSummary.models.day

`string` = `...`

#### config.aiSummary.models.month

`string` = `...`

#### config.aiSummary.models.week

`string` = `...`

#### config.aiSummary.projectContext

`string` = `...`

#### config.aiSummary.temperature

`number` = `...`

#### config.botUsers?

`string`[] = `...`

#### config.contributionStartDate?

`string` = `...`

#### config.repositories

`object`[] = `...`

#### config.scoring

\{ `codeChange`: \{ `maxLines`: `number`; `perFile`: `number`; `perLineAddition`: `number`; `perLineDeletion`: `number`; `testCoverageBonus`: `number`; \}; `comment`: \{ `base`: `number`; `diminishingReturns`: `number`; `maxPerThread`: `number`; `substantiveMultiplier`: `number`; \}; `issue`: \{ `base`: `number`; `closedBonus`: `number`; `perComment`: `number`; `resolutionSpeedMultiplier`: `number`; `withLabelsMultiplier`: `Record`\<`string`, `number`\>; \}; `pullRequest`: \{ `base`: `number`; `closingIssueBonus`: `number`; `complexityMultiplier`: `number`; `descriptionMultiplier`: `number`; `maxPerDay`: `number`; `merged`: `number`; `optimalSizeBonus`: `number`; `perApproval`: `number`; `perComment`: `number`; `perReview`: `number`; \}; `reaction`: \{ `base`: `number`; `diminishingReturns`: `number`; `maxPerDay`: `number`; `received`: `number`; `types`: `Record`\<`string`, `number`\>; \}; `review`: \{ `approved`: `number`; `base`: `number`; `changesRequested`: `number`; `commented`: `number`; `detailedFeedbackMultiplier`: `number`; `maxPerDay`: `number`; `thoroughnessMultiplier`: `number`; \}; \} = `ScoringConfigSchema`

#### config.scoring.codeChange

\{ `maxLines`: `number`; `perFile`: `number`; `perLineAddition`: `number`; `perLineDeletion`: `number`; `testCoverageBonus`: `number`; \} = `...`

#### config.scoring.codeChange.maxLines

`number` = `...`

#### config.scoring.codeChange.perFile

`number` = `...`

#### config.scoring.codeChange.perLineAddition

`number` = `...`

#### config.scoring.codeChange.perLineDeletion

`number` = `...`

#### config.scoring.codeChange.testCoverageBonus

`number` = `...`

#### config.scoring.comment

\{ `base`: `number`; `diminishingReturns`: `number`; `maxPerThread`: `number`; `substantiveMultiplier`: `number`; \} = `...`

#### config.scoring.comment.base

`number` = `...`

#### config.scoring.comment.diminishingReturns

`number` = `...`

#### config.scoring.comment.maxPerThread

`number` = `...`

#### config.scoring.comment.substantiveMultiplier

`number` = `...`

#### config.scoring.issue

\{ `base`: `number`; `closedBonus`: `number`; `perComment`: `number`; `resolutionSpeedMultiplier`: `number`; `withLabelsMultiplier`: `Record`\<`string`, `number`\>; \} = `...`

#### config.scoring.issue.base

`number` = `...`

#### config.scoring.issue.closedBonus

`number` = `...`

#### config.scoring.issue.perComment

`number` = `...`

#### config.scoring.issue.resolutionSpeedMultiplier

`number` = `...`

#### config.scoring.issue.withLabelsMultiplier

`Record`\<`string`, `number`\> = `...`

#### config.scoring.pullRequest

\{ `base`: `number`; `closingIssueBonus`: `number`; `complexityMultiplier`: `number`; `descriptionMultiplier`: `number`; `maxPerDay`: `number`; `merged`: `number`; `optimalSizeBonus`: `number`; `perApproval`: `number`; `perComment`: `number`; `perReview`: `number`; \} = `...`

#### config.scoring.pullRequest.base

`number` = `...`

#### config.scoring.pullRequest.closingIssueBonus

`number` = `...`

#### config.scoring.pullRequest.complexityMultiplier

`number` = `...`

#### config.scoring.pullRequest.descriptionMultiplier

`number` = `...`

#### config.scoring.pullRequest.maxPerDay

`number` = `...`

#### config.scoring.pullRequest.merged

`number` = `...`

#### config.scoring.pullRequest.optimalSizeBonus

`number` = `...`

#### config.scoring.pullRequest.perApproval

`number` = `...`

#### config.scoring.pullRequest.perComment

`number` = `...`

#### config.scoring.pullRequest.perReview

`number` = `...`

#### config.scoring.reaction

\{ `base`: `number`; `diminishingReturns`: `number`; `maxPerDay`: `number`; `received`: `number`; `types`: `Record`\<`string`, `number`\>; \} = `...`

#### config.scoring.reaction.base

`number` = `...`

#### config.scoring.reaction.diminishingReturns

`number` = `...`

#### config.scoring.reaction.maxPerDay

`number` = `...`

#### config.scoring.reaction.received

`number` = `...`

#### config.scoring.reaction.types

`Record`\<`string`, `number`\> = `...`

#### config.scoring.review

\{ `approved`: `number`; `base`: `number`; `changesRequested`: `number`; `commented`: `number`; `detailedFeedbackMultiplier`: `number`; `maxPerDay`: `number`; `thoroughnessMultiplier`: `number`; \} = `...`

#### config.scoring.review.approved

`number` = `...`

#### config.scoring.review.base

`number` = `...`

#### config.scoring.review.changesRequested

`number` = `...`

#### config.scoring.review.commented

`number` = `...`

#### config.scoring.review.detailedFeedbackMultiplier

`number` = `...`

#### config.scoring.review.maxPerDay

`number` = `...`

#### config.scoring.review.thoroughnessMultiplier

`number` = `...`

#### config.tags

\{ `area`: `object`[]; `role`: `object`[]; `tech`: `object`[]; \} = `...`

#### config.tags.area

`object`[] = `...`

#### config.tags.role

`object`[] = `...`

#### config.tags.tech

`object`[] = `...`

#### dateRange?

\{ `endDate?`: `string`; `startDate?`: `string`; \}

#### dateRange.endDate?

`string`

#### dateRange.startDate?

`string`

#### logger?

`Logger`

#### outputDir

`string`

#### overwrite?

`boolean`

#### repoId?

`string`

## Returns

[`RepositoryStatsPipelineContext`](../interfaces/RepositoryStatsPipelineContext.md)
