# Function: getDateRangeForPeriod()

> **getDateRangeForPeriod**(`period`): `DateRange`

Defined in: [src/lib/pipelines/queryHelpers.ts:79](https://github.com/elizaOS/elizaos.github.io/blob/4810f50019028b92f4f2a0ac31323fd787c7f288/src/lib/pipelines/queryHelpers.ts#L79)

Get a date range for common time periods

## Parameters

### period

Time period identifier ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all')

`"all"` | `"daily"` | `"weekly"` | `"monthly"` | `"quarterly"` | `"yearly"`

## Returns

`DateRange`

DateRange object with startDate and endDate strings
