# Variable: TagConfigSchema

> `const` **TagConfigSchema**: `ZodObject`\<\{ `category`: `ZodEnum`\<\[`"AREA"`, `"ROLE"`, `"TECH"`\]\>; `description`: `ZodOptional`\<`ZodString`\>; `name`: `ZodString`; `patterns`: `ZodArray`\<`ZodString`, `"many"`\>; `weight`: `ZodDefault`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `category`: `"AREA"` \| `"ROLE"` \| `"TECH"`; `description?`: `string`; `name`: `string`; `patterns`: `string`[]; `weight`: `number`; \}, \{ `category`: `"AREA"` \| `"ROLE"` \| `"TECH"`; `description?`: `string`; `name`: `string`; `patterns`: `string`[]; `weight?`: `number`; \}\>

Defined in: [src/lib/pipelines/pipelineConfig.ts:72](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/pipelineConfig.ts#L72)
