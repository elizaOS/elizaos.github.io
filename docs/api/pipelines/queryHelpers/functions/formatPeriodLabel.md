# Function: formatPeriodLabel()

> **formatPeriodLabel**(`dateColumn`, `period`): `SQL`\<`string`\>

Defined in: [src/lib/pipelines/queryHelpers.ts:132](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/queryHelpers.ts#L132)

Format a period identifier for time-based aggregations

## Parameters

### dateColumn

`SQLiteColumn`

Date column to format

### period

Aggregation period type

`"daily"` | `"weekly"` | `"monthly"` | `"quarterly"` | `"yearly"`

## Returns

`SQL`\<`string`\>

SQL expression for the formatted period
