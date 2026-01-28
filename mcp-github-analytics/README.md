# MCP GitHub Analytics

MCP server for GitHub contributor analytics. Works with any fork of the [GitHub Analytics Platform](https://github.com/elizaOS/elizaos.github.io).

```bash
npx mcp-github-analytics
```

## Tools

| Tool                | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `get_stats`         | Project overview: total contributors, activity, distributions |
| `list_repos`        | List tracked repositories                                     |
| `list_contributors` | Top contributors by period                                    |
| `get_contributor`   | Single contributor's profile                                  |
| `get_summary`       | AI summary (contributor/repo/project)                         |
| `find_contributors` | Search by tier/class/focus/score                              |

## Examples

```
"What are the project stats?"
"List the top 10 contributors this month"
"Get wtfsayo's profile"
"Summarize what happened in elizaos/eliza this week"
"Find legend-tier Builders"
"Who focuses on TypeScript?"
```

## Config

**Claude Desktop** (`~/.config/claude-desktop/config.json`):

```json
{
  "mcpServers": {
    "github-analytics": {
      "command": "npx",
      "args": ["mcp-github-analytics"],
      "env": {
        "MCP_API_BASE_URL": "https://elizaos.github.io"
      }
    }
  }
}
```

**For your fork:**

```json
{ "env": { "MCP_API_BASE_URL": "https://yourorg.github.io/your-analytics" } }
```

## Character System

**Tiers:** beginner → regular → active → veteran → elite → legend

**Classes:** Builder (PRs), Hunter (issues), Scribe (docs), Maintainer (PRs+reviews), Pathfinder (PRs+issues)

**Focus Areas:** typescript, core, ui, react, docs, tests, api, database, devops, etc.

## Development

```bash
cd mcp-github-analytics
npm install && npm run build
npx @modelcontextprotocol/inspector ./dist/index.js
```

## License

MIT
