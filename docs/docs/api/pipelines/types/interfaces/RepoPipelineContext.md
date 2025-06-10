# Interface: RepoPipelineContext

Defined in: [src/lib/pipelines/types.ts:30](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L30)

Extended context with common fields for repository operations

## Extends

- [`BasePipelineContext`](BasePipelineContext.md)

## Extended by

- [`ContributorPipelineContext`](../../contributors/context/interfaces/ContributorPipelineContext.md)
- [`RepositoryStatsPipelineContext`](../../export/context/interfaces/RepositoryStatsPipelineContext.md)
- [`IngestionPipelineContext`](../../ingest/context/interfaces/IngestionPipelineContext.md)
- [`SummarizerPipelineContext`](../../summarize/context/interfaces/SummarizerPipelineContext.md)

## Properties

### config

> **config**: `object`

Defined in: [src/lib/pipelines/types.ts:22](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L22)

Required pipeline configuration

#### aiSummary

> **aiSummary**: `object` = `AISummaryConfigSchema`

##### aiSummary.apiKey

> **apiKey**: `string`

##### aiSummary.defaultModel

> **defaultModel**: `string`

##### aiSummary.enabled

> **enabled**: `boolean`

##### aiSummary.endpoint

> **endpoint**: `string`

##### aiSummary.max_tokens

> **max_tokens**: `number`

##### aiSummary.models

> **models**: `object`

##### aiSummary.models.day

> **day**: `string`

##### aiSummary.models.month

> **month**: `string`

##### aiSummary.models.week

> **week**: `string`

##### aiSummary.projectContext

> **projectContext**: `string`

##### aiSummary.temperature

> **temperature**: `number`

#### botUsers?

> `optional` **botUsers**: `string`[]

#### contributionStartDate?

> `optional` **contributionStartDate**: `string`

#### repositories

> **repositories**: `object`[]

#### scoring

> **scoring**: `object` = `ScoringConfigSchema`

##### scoring.codeChange

> **codeChange**: `object`

##### scoring.codeChange.maxLines

> **maxLines**: `number`

##### scoring.codeChange.perFile

> **perFile**: `number`

##### scoring.codeChange.perLineAddition

> **perLineAddition**: `number`

##### scoring.codeChange.perLineDeletion

> **perLineDeletion**: `number`

##### scoring.codeChange.testCoverageBonus

> **testCoverageBonus**: `number`

##### scoring.comment

> **comment**: `object`

##### scoring.comment.base

> **base**: `number`

##### scoring.comment.diminishingReturns

> **diminishingReturns**: `number`

##### scoring.comment.maxPerThread

> **maxPerThread**: `number`

##### scoring.comment.substantiveMultiplier

> **substantiveMultiplier**: `number`

##### scoring.issue

> **issue**: `object`

##### scoring.issue.base

> **base**: `number`

##### scoring.issue.closedBonus

> **closedBonus**: `number`

##### scoring.issue.perComment

> **perComment**: `number`

##### scoring.issue.resolutionSpeedMultiplier

> **resolutionSpeedMultiplier**: `number`

##### scoring.issue.withLabelsMultiplier

> **withLabelsMultiplier**: `Record`\<`string`, `number`\>

##### scoring.pullRequest

> **pullRequest**: `object`

##### scoring.pullRequest.base

> **base**: `number`

##### scoring.pullRequest.closingIssueBonus

> **closingIssueBonus**: `number`

##### scoring.pullRequest.complexityMultiplier

> **complexityMultiplier**: `number`

##### scoring.pullRequest.descriptionMultiplier

> **descriptionMultiplier**: `number`

##### scoring.pullRequest.maxPerDay

> **maxPerDay**: `number`

##### scoring.pullRequest.merged

> **merged**: `number`

##### scoring.pullRequest.optimalSizeBonus

> **optimalSizeBonus**: `number`

##### scoring.pullRequest.perApproval

> **perApproval**: `number`

##### scoring.pullRequest.perComment

> **perComment**: `number`

##### scoring.pullRequest.perReview

> **perReview**: `number`

##### scoring.reaction

> **reaction**: `object`

##### scoring.reaction.base

> **base**: `number`

##### scoring.reaction.diminishingReturns

> **diminishingReturns**: `number`

##### scoring.reaction.maxPerDay

> **maxPerDay**: `number`

##### scoring.reaction.received

> **received**: `number`

##### scoring.reaction.types

> **types**: `Record`\<`string`, `number`\>

##### scoring.review

> **review**: `object`

##### scoring.review.approved

> **approved**: `number`

##### scoring.review.base

> **base**: `number`

##### scoring.review.changesRequested

> **changesRequested**: `number`

##### scoring.review.commented

> **commented**: `number`

##### scoring.review.detailedFeedbackMultiplier

> **detailedFeedbackMultiplier**: `number`

##### scoring.review.maxPerDay

> **maxPerDay**: `number`

##### scoring.review.thoroughnessMultiplier

> **thoroughnessMultiplier**: `number`

#### tags

> **tags**: `object`

##### tags.area

> **area**: `object`[]

##### tags.role

> **role**: `object`[]

##### tags.tech

> **tech**: `object`[]

#### Inherited from

[`BasePipelineContext`](BasePipelineContext.md).[`config`](BasePipelineContext.md#config)

---

### dateRange?

> `optional` **dateRange**: `object`

Defined in: [src/lib/pipelines/types.ts:34](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L34)

Date range for filtering data

#### endDate?

> `optional` **endDate**: `string`

#### startDate?

> `optional` **startDate**: `string`

---

### logger?

> `optional` **logger**: `Logger`

Defined in: [src/lib/pipelines/types.ts:24](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L24)

Logger for this pipeline

#### Inherited from

[`BasePipelineContext`](BasePipelineContext.md).[`logger`](BasePipelineContext.md#logger)

---

### repoId?

> `optional` **repoId**: `string`

Defined in: [src/lib/pipelines/types.ts:32](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/types.ts#L32)

Repository ID to filter processing
