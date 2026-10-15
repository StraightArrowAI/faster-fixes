# @fasterfixes/mcp

> **[Documentation](https://faster-fixes.com/docs)** · [Website](https://faster-fixes.com)

MCP server for [Faster Fixes](https://faster-fixes.com) — connect AI coding agents to your client feedback.

Clients leave feedback on your site via the widget. This MCP server lets your AI coding agent fetch that feedback and update its status, so you never leave your terminal.

## Prerequisites

1. **Agent token** — Organization Settings > Agent Tokens > Create token
2. **Project ID** — Project Settings > the `proj_...` identifier

## Installation

No global install needed. Run a single command to configure your editor.

### Claude Code

```bash
claude mcp add faster-fixes -s project \
  --env FASTER_FIXES_TOKEN=ff_agent_xxx \
  --env FASTER_FIXES_PROJECT=proj_xxx \
  -- npx -y @fasterfixes/mcp
```

Or add to `.mcp.json` at your project root:

```json
{
  "mcpServers": {
    "faster-fixes": {
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_TOKEN": "ff_agent_your_token_here",
        "FASTER_FIXES_PROJECT": "proj_your_project_id"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` for global):

```json
{
  "mcpServers": {
    "faster-fixes": {
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_TOKEN": "ff_agent_your_token_here",
        "FASTER_FIXES_PROJECT": "proj_your_project_id"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "faster-fixes": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_TOKEN": "ff_agent_your_token_here",
        "FASTER_FIXES_PROJECT": "proj_your_project_id"
      }
    }
  }
}
```

Note: VS Code uses `"servers"` (not `"mcpServers"`) and requires `"type": "stdio"`.

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "faster-fixes": {
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_TOKEN": "ff_agent_your_token_here",
        "FASTER_FIXES_PROJECT": "proj_your_project_id"
      }
    }
  }
}
```

### Codex

Add to `.codex/config.toml` in your project (or `~/.codex/config.toml` for global):

```toml
[mcp_servers.faster-fixes]
command = "npx"
args = ["-y", "@fasterfixes/mcp"]

[mcp_servers.faster-fixes.env]
FASTER_FIXES_TOKEN = "ff_agent_your_token_here"
FASTER_FIXES_PROJECT = "proj_your_project_id"
```

Note: Codex uses TOML, not JSON.

### Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "faster-fixes": {
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_TOKEN": "ff_agent_your_token_here",
        "FASTER_FIXES_PROJECT": "proj_your_project_id"
      }
    }
  }
}
```

Note: Zed uses `"context_servers"` as the key, and the config goes directly in your main settings file.

## Agent Skill (optional)

For a one-command workflow, install the **fix-feedback** skill. It teaches your agent the full loop: fetch → fix → resolve.

```bash
npx skills add manucoffin/faster-fixes --skill fix-feedback
```

Then just say `fix feedback` and your agent handles the rest. Works with Claude Code, Cursor, Windsurf, and 40+ other agents via [skills.sh](https://skills.sh).

## Usage

After configuring, ask your agent:

- "Check for new feedback"
- "Get all open feedback and fix them"
- "Mark feedback abc123 as resolved"

Or set up a scheduled task to fetch and fix feedback automatically.

## Tools

Recommended workflow: `list_feedbacks` → `list_comments` for items with `commentCount` above 0 → fix the issue → `move_feedback` or `update_feedback_status` with a closeout `comment`.

### `list_feedbacks`

List feedback items for your project. Returns board column, tags (including `env`), assignee, team comment count, page URL, CSS selector, click coordinates, component tree, browser info, and screenshot.

| Parameter  | Type   | Required | Description                                                               |
| ---------- | ------ | -------- | ------------------------------------------------------------------------- |
| `status`   | string | No       | Filter: `new`, `in_progress`, `resolved`, `closed`                        |
| `page_url` | string | No       | Filter by the page where feedback was left                                |
| `env`      | string | No       | Filter by environment tag, e.g. `dev` or `prod`. `none` for items without one |
| `column`   | string | No       | Filter by board column name (case-insensitive) or ID                      |
| `format`   | string | No       | `markdown` (default) or `json`                                            |

### `list_columns`

List the project's board columns in board order, with each column's status and ID. Takes no parameters.

### `move_feedback`

Move a feedback item to a board column. The item takes the column's status, and archived items are un-archived. An unknown column returns the valid names.

| Parameter     | Type   | Required | Description                                                          |
| ------------- | ------ | -------- | -------------------------------------------------------------------- |
| `feedback_id` | string | Yes      | The feedback ID                                                      |
| `column`      | string | Yes      | Column name (case-insensitive) or ID, from `list_columns`            |
| `comment`     | string | No       | Note for the team, up to 5000 characters. Requires `feedbacks:comment` |

### `update_feedback_status`

Update the status of a feedback item. The item lands in the first column of that status; use `move_feedback` to target a specific column.

| Parameter     | Type   | Required | Description                                                                |
| ------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `feedback_id` | string | Yes      | The feedback ID                                                            |
| `status`      | string | Yes      | `new`, `in_progress`, `resolved`, or `closed`                              |
| `comment`     | string | No       | Closeout note for the team, up to 5000 characters. Requires `feedbacks:comment` |

### `list_comments`

Read the team's comment thread on a feedback item, oldest first. Comments come from team members and agents, never from the reviewer.

| Parameter     | Type   | Required | Description     |
| ------------- | ------ | -------- | --------------- |
| `feedback_id` | string | Yes      | The feedback ID |

### `add_comment`

Add a comment to a feedback item's team thread. Requires a token with the "Add comments" permission (`feedbacks:comment`). Agent comments show in the dashboard under the token's name with an "Agent" badge.

| Parameter     | Type   | Required | Description                     |
| ------------- | ------ | -------- | ------------------------------- |
| `feedback_id` | string | Yes      | The feedback ID                 |
| `body`        | string | Yes      | Comment text, 1–5000 characters |

### `create_feedbacks`

Create one or many feedback items. Designed for migrating from BugHerd, Marker.io, Userback, Usersnap, and similar tools — feed the agent a CSV or JSON export and it will populate Faster Fixes. The batch is atomic, and integrations (e.g. GitHub issue creation) are intentionally skipped so an import does not fan out into hundreds of issues.

| Parameter       | Type   | Required | Description                                                                                |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `feedbacks`     | array  | Yes      | Up to 100 feedback items per call. See item shape below.                                   |
| `reviewer_name` | string | No       | Name of the reviewer to attribute imports to. Reused if it exists. Defaults to "Imported feedback". |
| `source`        | string | No       | Origin tool tag (e.g. `bugherd`, `marker.io`). Stamped into each item's metadata.          |

Each feedback item:

| Field            | Type   | Required | Description                                                          |
| ---------------- | ------ | -------- | -------------------------------------------------------------------- |
| `comment`        | string | Yes      | Bug description / feedback text.                                     |
| `pageUrl`        | string | Yes      | Page URL where the feedback was originally left.                     |
| `status`         | string | No       | `new` (default), `in_progress`, `resolved`, or `closed`.             |
| `selector`       | string | No       | CSS selector of the targeted element.                                |
| `clickX`         | number | No       | Click X coordinate (px).                                             |
| `clickY`         | number | No       | Click Y coordinate (px).                                             |
| `browserName`    | string | No       | Browser name from the original report.                               |
| `browserVersion` | string | No       | Browser version.                                                     |
| `os`             | string | No       | Operating system.                                                    |
| `viewportWidth`  | number | No       | Viewport width (px).                                                 |
| `viewportHeight` | number | No       | Viewport height (px).                                                |
| `createdAt`      | string | No       | ISO 8601 timestamp. Preserves the original report date during migration. |
| `metadata`       | object | No       | Arbitrary key/value pairs (e.g. `{ "originalId": "bh-12345" }`).     |

## Environment variables

| Variable               | Required | Description                                           |
| ---------------------- | -------- | ----------------------------------------------------- |
| `FASTER_FIXES_TOKEN`   | Yes      | Agent token from Organization Settings                |
| `FASTER_FIXES_PROJECT` | Yes      | Project ID (`proj_...`) from Project Settings         |
| `FASTER_FIXES_URL`     | No       | API base URL (defaults to `https://www.faster-fixes.com`) |

## Security

- The agent token is scoped to your organization. Each capability (read, update status and column, comment, create) is a separate permission you grant when creating the token — leave any unchecked to lock the agent out of that operation.
- No delete or admin operations are available.
- Tokens can be revoked instantly from the dashboard.
- All API calls are rate-limited, and bulk creates are capped at 100 items per call and stop at your plan's feedback limit.

## License

[MIT](./LICENSE)
