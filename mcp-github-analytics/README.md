# MCP GitHub Analytics

MCP server for GitHub contributor analytics. Queries SQLite database directly for PRs, issues, contributors, and AI summaries. Includes quality validation tools for detecting gaming and validating contribution quality.

## Setup

```bash
export MCP_DB_PATH=/path/to/db.sqlite
npx mcp-github-analytics
```

## Tools (13)

### Core Analytics

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

### Quality Validation

Tools for validating contribution quality and detecting gaming - essential for AI agents approving class/tier promotions.

| Tool               | Description                       | Detects                                          |
| ------------------ | --------------------------------- | ------------------------------------------------ |
| `list_reviews`     | Code reviews with quality metrics | Rubber-stamping, low-effort approvals            |
| `list_comments`    | Comments with spam detection      | Duplicate comments, short/low-effort comments    |
| `get_file_changes` | File changes from PRs             | Docs-only contributors, code padding, PR farming |
| `get_reactions`    | Emoji reactions on PRs/issues     | Community sentiment, engagement patterns         |

## Examples

### Core Analytics

```
"What are the project stats?"
"List the top 10 contributors this week"
"Get wtfsayo's profile"
"What PRs did shakkernerd open?"
"Show me recent activity in elizaos/eliza"
"Find legend-tier contributors who focus on TypeScript"
"Summarize what happened this week"
```

### Quality Validation

```
"Show @alice's reviews - what's her approval rate?"
"Find reviewers who always approve without comments"
"List comments shorter than 20 characters"
"What file types does @bob typically change? Is it all docs?"
"Find contributors whose PRs get the most positive reactions"
"Before promoting @carol to Maintainer, validate her review quality"
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
| **Code Reviews**         | `list_reviews`                                              |
| **PR/Issue Comments**    | `list_comments`                                             |
| **File Changes**         | `get_file_changes`                                          |
| **Reactions**            | `get_reactions`                                             |

### Not Yet Exposed

| Data            | In Database                   | Notes                         |
| --------------- | ----------------------------- | ----------------------------- |
| Untracked repos | `untracked_repositories`      | Repos in org not being scored |
| Commits         | `raw_commits`                 | Commit messages, SHAs         |
| Labels          | `labels`, `*_labels`          | Issue/PR labels               |
| PR→Issue links  | `pr_closing_issue_references` | PRs that close issues         |

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
| Quality validation      | ❌         | ✅                    |

**Use both**: GitHub MCP for real-time operations, this MCP for analytics and quality validation.

## License

MIT
