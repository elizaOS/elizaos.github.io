# MCP GitHub Analytics

MCP server for GitHub contributor analytics. Queries SQLite database directly for PRs, issues, contributors, and AI summaries.

## Setup

```bash
export MCP_DB_PATH=/path/to/db.sqlite
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

## Data Coverage

### Included

| Data                     | Tools                                                       |
| ------------------------ | ----------------------------------------------------------- |
| **Contributors**         | `list_contributors`, `get_contributor`, `find_contributors` |
| **Scores & Rankings**    | `get_contributor`, `list_contributors`                      |
| **Focus Areas**          | `get_contributor`, `find_contributors`                      |
| **Achievements/Badges**  | `get_contributor`                                           |
| **Wallet Addresses**     | `get_contributor`                                           |
| **Tracked Repositories** | `list_repos`                                                |
| **Pull Requests**        | `list_prs`, `get_activity`                                  |
| **Issues**               | `list_issues`, `get_activity`                               |
| **AI Summaries**         | `get_summary`                                               |
| **Project Stats**        | `get_stats`                                                 |

### Not Yet Exposed

| Data            | In Database                        | Notes                         |
| --------------- | ---------------------------------- | ----------------------------- |
| Untracked repos | `untracked_repositories`           | Repos in org not being scored |
| Commits         | `raw_commits`                      | Commit messages, SHAs         |
| File changes    | `raw_pr_files`, `raw_commit_files` | Which files changed           |
| PR comments     | `pr_comments`                      | Discussion on PRs             |
| Issue comments  | `issue_comments`                   | Discussion on issues          |
| Reviews         | `pr_reviews`                       | Code review details           |
| Reactions       | `*_reactions` tables               | Emoji reactions               |
| Labels          | `labels`, `*_labels`               | Issue/PR labels               |
| PR→Issue links  | `pr_closing_issue_references`      | PRs that close issues         |

Want any of these exposed? Open an issue or PR.

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

Requires the SQLite database from GitHub Analytics platform:

1. **Local dev**: `bun run data:sync` to download production data
2. **From dump**: Download from `_data` branch
3. **Fresh**: `bun run pipeline ingest && bun run pipeline process`

## vs GitHub MCP

| Capability              | GitHub MCP | This MCP              |
| ----------------------- | ---------- | --------------------- |
| All of GitHub           | ✅         | ❌ Tracked repos only |
| Create/edit PRs         | ✅         | ❌ Read-only          |
| Real-time data          | ✅         | ⚠️ Updated daily      |
| Contributor rankings    | ❌         | ✅                    |
| Focus areas/expertise   | ❌         | ✅                    |
| AI activity summaries   | ❌         | ✅                    |
| Tier/achievement system | ❌         | ✅                    |
| Wallet addresses        | ❌         | ✅                    |

**Use both**: GitHub MCP for real-time operations, this MCP for analytics.

## License

MIT
