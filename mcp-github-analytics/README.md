# MCP GitHub Analytics Server

A **generic, fork-friendly** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for GitHub contributor analytics. Works with any project using the [GitHub Analytics Platform](https://github.com/elizaOS/elizaos.github.io).

## Quick Start

```bash
npx mcp-github-analytics
```

## Tools (4 total)

| Tool              | Description                                        |
| ----------------- | -------------------------------------------------- |
| `get_leaderboard` | Get contributor rankings (weekly/monthly/lifetime) |
| `get_profile`     | Get a contributor's full profile                   |
| `get_summary`     | Get AI summary (contributor, repo, or project)     |
| `search`          | Search contributors by tier/class/focus/score      |

### `get_leaderboard`

```
"Get the top 10 contributors this month"
"Show me the weekly leaderboard"
```

**Parameters:**

- `period` (required): `"weekly"` | `"monthly"` | `"lifetime"`
- `limit` (optional): Max entries (default: 20)

### `get_profile`

```
"Get wtfsayo's profile"
"Show me the profile for tcm390"
```

**Parameters:**

- `username` (required): GitHub username

### `get_summary`

```
"Summarize what wtfsayo did this week"
"What happened in elizaos/eliza this month?"
"Give me the project summary for this week"
```

**Parameters:**

- `type` (required): `"contributor"` | `"repo"` | `"project"`
- `interval` (required): `"day"` | `"week"` | `"month"` | `"lifetime"`
- `username`: Required when `type="contributor"`
- `owner`, `repo`: Required when `type="repo"`

### `search`

```
"Find all legend-tier contributors"
"Find Builders who focus on TypeScript"
"Who are the top 20 elite reviewers?"
```

**Parameters (all optional):**

- `tier`: `"beginner"` | `"regular"` | `"active"` | `"veteran"` | `"elite"` | `"legend"`
- `class`: `"Builder"` | `"Hunter"` | `"Scribe"` | `"Maintainer"` | `"Pathfinder"`
- `focus`: Skill tag like `"typescript"`, `"core"`, `"ui"`, `"docs"`
- `minScore`: Minimum score
- `maxRank`: Maximum rank (e.g., 50 = top 50)
- `limit`: Max results (default: 20)
- `period`: Which leaderboard (default: `"lifetime"`)

## Configuration

### Environment Variables

| Variable           | Description               | Default                     |
| ------------------ | ------------------------- | --------------------------- |
| `MCP_API_BASE_URL` | Base URL for the JSON API | `https://elizaos.github.io` |

### Claude Desktop

Add to `~/.config/claude-desktop/config.json` (Linux) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

### Cursor

Add to Cursor MCP settings:

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

### For Your Own Fork

Point to your deployment:

```json
{
  "env": {
    "MCP_API_BASE_URL": "https://myorg.github.io/my-analytics"
  }
}
```

## Character System

### Tiers

`beginner` → `regular` → `active` → `veteran` → `elite` → `legend`

### Classes

- **Builder** - Primarily contributes via PRs
- **Hunter** - Primarily opens issues
- **Scribe** - Focuses on documentation
- **Maintainer** - Builder + reviews
- **Pathfinder** - Builder + Hunter hybrid

### Focus Areas

`typescript`, `core`, `ui`, `react`, `docs`, `tests`, `api`, `database`, `devops`, `infra`, etc.

## Development

```bash
cd mcp-github-analytics
npm install
npm run build
npm start

# Test with MCP Inspector
npx @modelcontextprotocol/inspector ./dist/index.js
```

## API Endpoints

The server reads from static JSON at the configured base URL:

| Path                                                            | Description       |
| --------------------------------------------------------------- | ----------------- |
| `/api/leaderboard-{period}.json`                                | Rankings          |
| `/api/contributors/{username}/profile.json`                     | Profiles          |
| `/api/summaries/contributors/{username}/{interval}/latest.json` | User summaries    |
| `/api/summaries/repos/{owner}_{repo}/{interval}/latest.json`    | Repo summaries    |
| `/api/summaries/overall/{interval}/latest.json`                 | Project summaries |

## License

MIT
