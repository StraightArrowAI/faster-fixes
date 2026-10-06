# Configurable board columns

- **Date**: 2026-10-06
- **Status**: Implemented
- **Decision record**: [ADR-0010](../adr/0010-board-columns-are-a-layer-over-status.md)

## Goal

Let each Project define its own kanban columns. The immediate need is an **In Test**
column between In progress and Resolved; the general need is that teams can add,
rename, reorder, and remove columns without a code change.

## Non-goals (v1)

- Column colors.
- Changing a column's category after creation.
- Surfacing column names in Slack, the widget, MCP, or tracker sync.
- Organization-level column templates.
- Drag-to-reorder columns in settings (up/down buttons only).

## Model

Status stays exactly as it is. A **Column** is a per-Project lane that belongs to one
**Category**, and the category set is the existing non-archived Status literals:
`new | in_progress | resolved`. `closed` (Archived) is never a column.

```prisma
model FeedbackColumn {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  name     String
  category String // "new" | "in_progress" | "resolved"; validated by FeedbackColumnCategoryEnum
  position Int

  feedbacks Feedback[]

  @@index([projectId, position])
  @@map("feedback_column")
}

model Feedback {
  // ...existing fields
  columnId String?
  column   FeedbackColumn? @relation(fields: [columnId], references: [id], onDelete: SetNull)
}
```

**Invariant:** when `columnId` is set, `column.category === feedback.status`.
**Null `columnId`** means "the first column, by position, in the Feedback's status
category". This lets create paths (widget `POST /api/v1/feedback`, agent
`create-feedbacks.ts`) stay untouched and makes deleting a column safe.

Every Project always has at least one column per category.

## Migration

1. Create `feedback_column` and `feedback.columnId`.
2. Seed three columns for every existing Project: New (`new`, 0), In Progress
   (`in_progress`, 1), Resolved (`resolved`, 2). Names match the labels of the
   fixed board they replace, so existing boards render unchanged.
3. Backfill `feedback.columnId` from `status` for non-archived rows, so later
   reordering doesn't move existing cards.
4. Both project-create mutations (`sidebar/project/create` and
   `onboarding/create-project`) seed the same three defaults.

## Write rules

Because `column.category === status` always holds, "keep the column if its category
matches the new status" reduces to "only write when the status actually changes".
`server/feedback/update-feedback-statuses.ts` (`updateFeedbackStatuses`) encodes that
as one conditional `updateMany` — `WHERE status <> new` → `SET status, columnId = NULL` —
so it needs no prior read and batches inside `$transaction([...])`.

| Write | Effect |
| --- | --- |
| Move card to a column (board drag, column select, bulk "move to") | `columnId = column.id`, `status = column.category` |
| Status set elsewhere — Linear/Jira/GitHub sync, agent status API, MCP | Keep current `columnId` if its category equals the new status; otherwise `null` (falls to first column of category) |
| Archive (`status = closed`) | `columnId = null` |
| Unarchive | Treated as "status set elsewhere" |

The "keep current column" branch is what stops an inbound Linear `started` sync from
yanking a card out of In Test back into In progress.

Status-change events and tracker sync continue to key off `status`. A move between two
columns of the same category (In progress → In Test) changes no status, emits no
status-change event, and triggers no tracker sync.

Paths that call the helper:

- `inbox/_features/feedback-panel/update-feedback-status.trpc.mutation.ts`
- `inbox/_features/actions-toolbar/bulk-update-feedback-status.trpc.mutation.ts`
- `api/v1/agent/feedbacks/[id]/status/_utils/update-feedback-status.ts`
- `server/inngest/sync-{linear,jira,github}-issue-status.ts`

## Board and inbox UI

- A tRPC query returns the Project's columns ordered by `position`.
- `kanban-board.client.tsx` renders one lane per column and groups cards by
  `columnId ?? firstColumnOf(status)`. Archived cards remain excluded.
- Card drop and bulk "move to" call `feedback.updateColumn`
  (`update-feedbacks-column.trpc.mutation.ts`), which sets `columnId` and
  `status = column.category` together and emits status-change events only for cards
  whose status changed.
- The panel's `status-select.client.tsx` and the bulk toolbar's "move to" list columns,
  plus the existing Archive action.

## Settings UI

A **Board columns** section in project settings (`settings/_features/board-columns/`):

- List columns in order with their category.
- Add: name + category. Inserted at the end of its category group.
- Rename inline.
- Reorder with up/down buttons. A column cannot move outside its category group, so
  lanes always read New → In progress → Resolved left to right.
- Delete: blocked if it is the last column in its category. If the column has cards,
  the confirm dialog states they move to the first remaining column in that category.

Validation (Zod): name 1–40 chars, unique per Project (case-insensitive).

## Unchanged

Widget (`STATUS_COLORS` keyed on `status`), MCP schemas, Slack blocks, the tracker
mapping files, `FeedbackStatusEnum`.

## Testing

- `updateFeedbackStatuses` against a real Postgres: same-status echo keeps In Test,
  status change clears the column, archive/unarchive, mixed bulk, column delete
  keeps status, other projects untouched. (The web app has no test runner; this was
  run as a throwaway script against a scratch database.)
- Migration: run `pnpm migrate:dev` against a seeded DB; assert every non-archived
  Feedback has a column whose category matches its status.
- Manual: add In Test, move a card through it, confirm a linked Linear issue's state is
  untouched by the In progress ↔ In Test move and updates on Resolved.
