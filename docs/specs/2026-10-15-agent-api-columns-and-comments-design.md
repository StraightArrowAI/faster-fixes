# Agent API and MCP: columns, comments, tags

- **Date**: 2026-10-15
- **Status**: Approved
- **Builds on**: [Feedback comments](2026-10-13-feedback-comments-design.md), ADR-0010 (columns), ADR-0013 (tags)

## Goal

Bring the agent API (`/api/v1/agent`) and `@fasterfixes/mcp` up to date with the
dashboard, so an agent can:

1. see each Feedback's column, tags (including `env`), assignee and comment count, and
   filter by environment and column;
2. list a Project's columns and move a Feedback to a specific column;
3. read a Feedback's comment thread and add comments, including a closeout comment in
   the same call as a move or status change.

## Non-goals

- Editing or deleting comments through the API.
- Assigning Feedback, creating or renaming columns.
- Bulk moves through the API (agents loop one Feedback at a time today).
- Changing scopes on existing tokens.

## Scopes

| Scope                     | Grants                                                    |
| ------------------------- | --------------------------------------------------------- |
| `feedbacks:read`          | list Feedback, **list columns, list comments** (new)       |
| `feedbacks:update_status` | status changes and **column moves** (new)                 |
| `feedbacks:create`        | import Feedback                                           |
| `feedbacks:comment` (new) | add comments                                              |

- A column move is a status write (a column carries its category), so it reuses
  `feedbacks:update_status` rather than adding a scope existing tokens lack.
- Comments are part of the Feedback an agent can already read, so reading them needs
  only `feedbacks:read`.
- Writing a comment puts text in front of the team, so it gets its own scope. Existing
  tokens are not widened: a team that wants agent comments creates a new token with
  "Add comments" checked. A move or status call that includes a `comment` without this
  scope fails with 403 before anything is written.

## Comment attribution

```prisma
model FeedbackComment {
  // ...existing
  agentTokenId String?
  agentToken   AgentToken? @relation(fields: [agentTokenId], references: [id], onDelete: SetNull)
  agentName    String?     // token name frozen at write time
}
```

- An agent comment has `authorId = null`, `agentTokenId` set and `agentName` set.
- The dashboard shows it as **{agentName}** with an "Agent" badge and a bot icon,
  instead of "Former member".
- Nobody can edit an agent comment; owners and admins can delete it (the existing rules
  already behave this way when `authorId` is null).
- Expand-only migration: two nullable columns, one index, one FK.

## Shared server logic

Two functions in `apps/web/src/server/feedback/`, used by both the board and the agent
API so the paths cannot drift:

- `moveFeedbacksToColumn(prisma, { feedbackIds, columnId, projectId, actor })` —
  the body of today's `updateFeedbacksColumn` tRPC mutation: sets `columnId` and
  `status`, returns previous status and column per Feedback, sends
  `feedback/status-changed` only for real status changes.
- `resolveBoardColumnName(columns, feedback)` — the server twin of
  `getBoardColumnId`, used to record a comment's "from" column.

## Endpoints

All responses are JSON. Errors keep the `{ error, code }` envelope. IDs are UUIDs.

### `GET /api/v1/agent/feedbacks` (changed)

- New query filters: `env` (matches `tags.env`; `none` for Feedback without one) and
  `column` (column id or name, case-insensitive).
- Each item adds:
  - `column: { id, name } | null` (null when archived)
  - `tags: Record<string, string>`
  - `assignee: { name } | null`
  - `commentCount: number`
- The markdown format adds column, env, other tags and comment count per item.

### `GET /api/v1/agent/columns?project=` (new) — `feedbacks:read`

Returns `{ columns: [{ id, name, status, position }] }` in board order. `status` is the
column's category.

### `POST /api/v1/agent/feedbacks/:id/column` (new) — `feedbacks:update_status`

Body: `{ column: string, comment?: string }`.

- `column` is a column id, or a name matched case-insensitively within the Feedback's
  Project. No match → 404 `COLUMN_NOT_FOUND` with the valid names in `columns`.
- Moving archived Feedback to a column un-archives it (same as the board).
- Moving to the current column is a no-op (no event), but the comment is still saved.
- With `comment`: requires `feedbacks:comment`; saves one comment recording
  "from → to" column names.
- Response: `{ id, status, column: { id, name }, updatedAt, comment: { id } | null }`.

### `POST /api/v1/agent/feedbacks/:id/status` (changed)

- Accepts an optional `comment` (same rules as above). The comment records the
  transition with `to` = the target column's name, or "Archived" for `closed`.
- Response adds `column` and `comment`.

### `GET /api/v1/agent/feedbacks/:id/comments` (new) — `feedbacks:read`

Returns `{ comments: [{ id, body, createdAt, editedAt, author: { type: "member" | "agent" | "former_member", name }, fromColumn, toColumn }] }`,
oldest first.

### `POST /api/v1/agent/feedbacks/:id/comments` (new) — `feedbacks:comment`

Body: `{ body: string }` (1–5000 chars, trimmed). Response: the created comment.

Rate limits: reads count as `agent:read`, everything that writes as `agent:write`
(existing buckets). A move or status call with a comment counts as one write.

## MCP (`@fasterfixes/mcp` 0.0.6)

| Tool                     | Change                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| `list_feedbacks`         | new `env` and `column` filters; output includes the new fields         |
| `list_columns`           | new                                                                    |
| `move_feedback`          | new: `feedback_id`, `column` (name or id), optional `comment`          |
| `update_feedback_status` | optional `comment`                                                     |
| `list_comments`          | new: `feedback_id`                                                     |
| `add_comment`            | new: `feedback_id`, `body`                                             |

Tool descriptions steer the workflow: list → fix → `move_feedback` (or
`update_feedback_status`) with a closeout comment. The server version string tracks the
package version. The user publishes the package.

## Dashboard

- Agent token dialog: an "Add comments" permission (`feedbacks:comment`).
- Comment item: agent author name, "Agent" badge, bot icon.

## Docs

`content/docs/api-reference/agent-api.mdx`, `content/docs/mcp/*.mdx` and
`concepts/agent-tokens.mdx` cover the new endpoints, tools and scope.

## Testing

Unit (Vitest): column reference resolution (id, case-insensitive name, no match),
`resolveBoardColumnName`, env/column list filters, comment author mapping
(member / agent / former member), scope check for an attached comment.

Manual (production after deploy): with a new token, `list_columns`, `move_feedback`
with a comment, `update_feedback_status` with a comment, `list_comments`,
`add_comment`; confirm the dashboard thread shows the agent author and the board moves.
A token without `feedbacks:comment` gets 403 on a move with a comment and nothing moves.
