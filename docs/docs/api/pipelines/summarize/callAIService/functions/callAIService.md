# Function: callAIService()

> **callAIService**(`prompt`, `config`, `options?`): `Promise`\<`string`\>

Defined in: [src/lib/pipelines/summarize/callAIService.ts:7](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/summarize/callAIService.ts#L7)

Call AI service to generate a summary

## Parameters

### prompt

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

### options?

#### maxTokens?

`number`

#### model?

`string`

#### temperature?

`number`

## Returns

`Promise`\<`string`\>
