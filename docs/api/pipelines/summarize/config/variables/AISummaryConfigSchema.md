# Variable: AISummaryConfigSchema

> `const` **AISummaryConfigSchema**: `ZodObject`\<\{ `apiKey`: `ZodString`; `defaultModel`: `ZodString`; `enabled`: `ZodDefault`\<`ZodBoolean`\>; `endpoint`: `ZodDefault`\<`ZodString`\>; `max_tokens`: `ZodDefault`\<`ZodNumber`\>; `models`: `ZodObject`\<\{ `day`: `ZodString`; `month`: `ZodString`; `week`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `day`: `string`; `month`: `string`; `week`: `string`; \}, \{ `day`: `string`; `month`: `string`; `week`: `string`; \}\>; `projectContext`: `ZodDefault`\<`ZodString`\>; `temperature`: `ZodDefault`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `apiKey`: `string`; `defaultModel`: `string`; `enabled`: `boolean`; `endpoint`: `string`; `max_tokens`: `number`; `models`: \{ `day`: `string`; `month`: `string`; `week`: `string`; \}; `projectContext`: `string`; `temperature`: `number`; \}, \{ `apiKey`: `string`; `defaultModel`: `string`; `enabled?`: `boolean`; `endpoint?`: `string`; `max_tokens?`: `number`; `models`: \{ `day`: `string`; `month`: `string`; `week`: `string`; \}; `projectContext?`: `string`; `temperature?`: `number`; \}\>

Defined in: [src/lib/pipelines/summarize/config.ts:6](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/summarize/config.ts#L6)

Schema for AI summary configuration
