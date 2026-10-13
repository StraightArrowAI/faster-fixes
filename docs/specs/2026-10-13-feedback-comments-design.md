# Feedback comments

- **Date**: 2026-10-13
- **Status**: Approved

## Goal

Give each Feedback a threaded comment history for the dashboard team: closeout notes
after work is done, and discussion between members. Moving a card offers an optional
comment so the reason for a move is recorded next to it.

## Non-goals

- Reviewer visibility. Reviewers never see comments, in the widget or anywhere else.
- Notifications (email, Slack, in-app).
- Syncing comments to GitHub, Linear, Jira or Slack.
- Mentions, reactions, attachments, rich text.

## Terminology

`Feedback.comment` is the reviewer's original text. In the UI it is now labelled
**Report**. A **Comment** is always a `FeedbackComment` written by a team member.

## Data model

```prisma
model FeedbackComment {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  editedAt  DateTime? // set only when the author edits the body

  feedbackId String
  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  authorId   String?
  author     Member?  @relation(fields: [authorId], references: [id], onDelete: SetNull)

  body String

  // Column names frozen at write time, so renaming or deleting a column never
  // rewrites history. Both null for a plain comment.
  fromColumnName String?
  toColumnName   String?

  @@index([feedbackId, createdAt])
  @@index([authorId])
  @@map("feedback_comment")
}
```

- A removed member's comments stay, shown as "Former member".
- `body` is trimmed, 1–5000 characters.
- Archive is stored as `toColumnName = "Archived"`.

**Migration**: one expand-only migration that creates `feedback_comment`. The
previously deployed code never reads it.

## Server

A `comments` router under `projects.feedback`:

| Procedure       | Input                                       | Who                        |
| --------------- | ------------------------------------------- | -------------------------- |
| `list`          | `{ feedbackId }`                            | any member                 |
| `create`        | `{ feedbackId, body, transition? }`         | any member                 |
| `createForMany` | `{ feedbackIds (1–200), body, transition? }` | any member                 |
| `update`        | `{ commentId, body }`                       | the author                 |
| `delete`        | `{ commentId }`                             | the author, owner or admin |

- `transition` is `{ from: string | null, to: string }` (column names, ≤ 100 chars).
- Every procedure resolves the Feedback's organization and requires membership.
- `createForMany` requires all ids to belong to one Project and writes in a single
  `createMany`.
- `list` returns comments oldest first with `author { id, name, image }` and
  `canEdit` / `canDelete` per comment, computed on the server.
- `update` sets `editedAt`. `delete` is a hard delete.
- `feedback.list` adds `commentCount` (Prisma `_count`).

The permission rules live in a pure `comment-permissions.ts`
(`canEditComment`, `canDeleteComment`) and the body/transition schema in
`feedback-comment.schema.ts`. Both are unit tested.

Board mutations, tracker sync, Slack, the widget and the agent/MCP API are unchanged.

## UI

**Detail panel**

- The "Comment" heading becomes "Report".
- A **Comments** section after Assignee, above the timestamps, loads `comments.list`
  lazily when the panel opens.
- Each comment shows the avatar, name, relative time, "edited" when `editedAt` is set,
  the body (line breaks kept) and, for move comments, a muted
  "Moved In progress → Resolved" line.
- A "⋯" menu offers Edit (author) and Delete (author, owner, admin). Delete asks for
  confirmation in an `AlertDialog`.
- A composer at the bottom: textarea and a "Comment" button; ⌘/Ctrl+Enter submits.
- Empty state: "No comments yet."

**Move dialog**

- Opens after a move succeeds from drag and drop, the panel's status select, bulk
  "Move to" or bulk Archive. Not for drops into the same column, and never when the
  move fails.
- Title "Add a comment"; description "Moved to Resolved" or "Moved 4 items to
  Resolved".
- Textarea, "Add comment" (primary) and "Skip". Esc and clicking outside skip.
- Single card: `create` with the transition. Bulk: `createForMany`; `from` is the
  shared source column when all cards came from one, otherwise null.
- One dialog at a time: a new move replaces an open dialog and its unsent text.
- Implemented as a provider around the inbox (`MoveCommentProvider`), so the board and
  the panel share one dialog.

**Card**

- A message icon and count in the metadata row when `commentCount > 0`.

## Testing

Unit (Vitest): comment permissions; body and transition validation; move-dialog
description text.

Manual (production after deploy): post, edit and delete in the panel; delete as an
admin; the move dialog for drag, status select, bulk move and bulk archive; Skip and
Esc; the card count; a removed member shows "Former member".
