# MCP GitHub Analytics

MCP server for GitHub contributor analytics. Queries SQLite database directly for full access to PRs, issues, contributors, and AI summaries.

## Setup

```bash
# Set path to your database
export MCP_DB_PATH=/path/to/db.sqlite

# Run
npx mcp-github-analytics
```

## Tools (9)

| Tool                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `get_stats`         | Project overview: contributors, repos, PRs, issues  |
| `list_repos`        | Tracked repositories                                |
| `list_contributors` | Top contributors by period                          |
| `get_contributor`   | Full profile with scores, focus areas, achievements |
| `get_summary`       | AI summaries (contributor/repo/project)             |
| `find_contributors` | Search by tier, focus area, min score               |
| `list_prs`          | Query pull requests                                 |
| `list_issues`       | Query issues                                        |
| `get_activity`      | Recent activity feed                                |

## Examples

```
"What are the project stats?"
"List the top 10 contributors this week"
"Get wtfsayo's profile"
"What PRs did shakkernerd open?"
"Show me recent activity in elizaos/eliza"
"Find legend-tier contributors who focus on TypeScript"
"Summarize what happened this week"
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
        "MCP_DB_PATH": "/path/to/db.sqlite"
      }
    }
  }
}
```

## Database

This server requires the SQLite database from the GitHub Analytics platform. Options:

1. **Local development**: Run `bun run data:sync` to download production data
2. **From dump**: Download from the `_data` branch and import ndjson files
3. **Fresh**: Run the pipeline to populate: `bun run pipeline ingest && bun run pipeline process`

## vs GitHub MCP

| Query                   | GitHub MCP       | This MCP              |
| ----------------------- | ---------------- | --------------------- |
| Real-time PR/issue data | ✅ All of GitHub | ✅ Tracked repos only |
| Create/edit PRs         | ✅               | ❌ Read-only          |
| Contributor rankings    | ❌               | ✅                    |
| Focus areas/expertise   | ❌               | ✅                    |
| AI activity summaries   | ❌               | ✅                    |
| Tier/achievement system | ❌               | ✅                    |

Use both: GitHub MCP for real-time operations, this MCP for analytics and finding experts.

## License

MIT
