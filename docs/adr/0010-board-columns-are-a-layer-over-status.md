---
status: proposed
---

# Board columns are a per-Project layer over Status, not a replacement for it

Teams need workflow lanes beyond New / In progress / Resolved (the first request is
**In Test**). We add a per-Project **Column** that belongs to one **Category**, where
the category set is the existing Status literals `new | in_progress | resolved`.
`Feedback.status` keeps its meaning and stays the field everything outside the board
reads.

## Why not make columns replace Status

`status` is a published contract. Shipped widget builds color pins from
`feedback.status` and cannot be updated in place; the MCP schema, Slack blocks, and the
Linear/Jira/GitHub mappings all key on it. Linear and Jira already solve the same
problem the same way — user-named states over a fixed type/category taxonomy — and our
sync code maps on that taxonomy. Keeping Status as our category means the integrations
need no change.

## Why not just add an `in_test` status

It would touch every Status consumer (three tracker mappings, widget colors, MCP enum,
Slack) and would be migrated again when configurable columns land.

## Why a table, not JSON on Project

A foreign key with `onDelete: SetNull` makes column deletion safe without cleanup code.

## Consequences

- One helper, `resolveColumnForStatus`, owns the `column.category === status`
  invariant. An inbound tracker status keeps the current column when its category
  already matches, so a sync never pulls a card out of a same-category lane.
- Moves between columns of the same category are invisible to trackers and
  notifications by design.
- A column's category is immutable; changing it would silently re-status every card in
  it and fan out tracker syncs.
