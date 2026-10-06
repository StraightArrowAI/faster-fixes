"use client";

import { useFeedbackMutations } from "@/app/(authenticated)/(project)/inbox/_features/use-feedback-mutations";
import type { GetFeedbackColumnsOutput } from "@/app/(authenticated)/(project)/settings/_features/board-columns/get-feedback-columns.trpc.query";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import * as React from "react";
import { BulkActionToolbar } from "../actions-toolbar/bulk-action-toolbar.client";
import type { GetFeedbackOutput } from "../get-feedback.trpc.query";
import { getBoardColumnId } from "./get-board-column-id";
import { KanbanCardOverlay } from "./kanban-card.client";
import { KanbanColumnBody, KanbanColumnHeader } from "./kanban-column.client";
import { KanbanMobile } from "./kanban-mobile.client";

type FeedbackItem = GetFeedbackOutput[number];

type KanbanBoardProps = {
  feedback: FeedbackItem[];
  columns: GetFeedbackColumnsOutput;
  pageUrlFilter: string | null;
  sort: string;
  onSelectFeedback: (id: string) => void;
};

function sortFeedback(items: FeedbackItem[], sort: string): FeedbackItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "updated":
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      default: // newest
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });
}

export function KanbanBoard({
  feedback,
  columns,
  pageUrlFilter,
  sort,
  onSelectFeedback,
}: KanbanBoardProps) {
  const { bulkUpdateStatus, updateColumn } = useFeedbackMutations();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Slightly higher distance so a quick click never starts a drag.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  // Filter out closed items and apply page URL filter
  const filtered = React.useMemo(() => {
    let items = feedback.filter((f) => f.status !== "closed");
    if (pageUrlFilter) {
      items = items.filter((f) => f.pageUrl === pageUrlFilter);
    }
    return items;
  }, [feedback, pageUrlFilter]);

  const grouped = React.useMemo(() => {
    const map: Record<string, FeedbackItem[]> = Object.fromEntries(
      columns.map((c) => [c.id, []]),
    );
    for (const item of filtered) {
      const columnId = getBoardColumnId(item, columns);
      if (columnId) map[columnId]?.push(item);
    }
    // Sort each column
    for (const key of Object.keys(map)) {
      map[key] = sortFeedback(map[key]!, sort);
    }
    return map;
  }, [filtered, columns, sort]);

  const boardColumns = columns.map((c) => ({ id: c.id, title: c.name }));

  const totalCount = filtered.length;

  const bulkToolbar = (
    <BulkActionToolbar
      selectedItems={feedback.filter((f) => selectedIds.has(f.id))}
      columns={columns}
      onMoveToColumn={handleBulkMove}
      onArchive={handleBulkArchive}
      onClearSelection={() => setSelectedIds(new Set())}
    />
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const feedbackId = active.id as string;
    const columnId = over.id as string;

    const item = feedback.find((f) => f.id === feedbackId);
    if (!item || getBoardColumnId(item, columns) === columnId) return;

    updateColumn([feedbackId], columnId);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeFeedback = activeId
    ? (feedback.find((f) => f.id === activeId) ?? null)
    : null;

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleSelectAll(_columnId: string, itemIds: string[]) {
    setSelectedIds((prev) => {
      const allSelected = itemIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of itemIds) next.delete(id);
      } else {
        for (const id of itemIds) next.add(id);
      }
      return next;
    });
  }

  function handleBulkMove(columnId: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    updateColumn(ids, columnId);
    setSelectedIds(new Set());
  }

  function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkUpdateStatus(ids, "closed");
    setSelectedIds(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {totalCount} {totalCount === 1 ? "item" : "items"}
        </p>
      </div>

      <KanbanMobile
        columns={boardColumns}
        grouped={grouped}
        selectedIds={selectedIds}
        toolbar={bulkToolbar}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSelectFeedback={onSelectFeedback}
      />

      <div className="hidden lg:block">{bulkToolbar}</div>

      {/* Desktop: headers and bodies share one scroll container so lanes stay
          aligned when a project has more columns than fit the viewport. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="hidden flex-col gap-4 overflow-x-auto pb-2 lg:flex">
          <div className="flex gap-4">
            {boardColumns.map((col) => (
              <div key={col.id} className="min-w-64 flex-1">
                <KanbanColumnHeader
                  id={col.id}
                  title={col.title}
                  count={(grouped[col.id] ?? []).length}
                  selectedIds={selectedIds}
                  itemIds={(grouped[col.id] ?? []).map((i) => i.id)}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            {boardColumns.map((col) => (
              <div key={col.id} className="flex min-w-64 flex-1">
                <KanbanColumnBody
                  id={col.id}
                  items={grouped[col.id] ?? []}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectFeedback={onSelectFeedback}
                />
              </div>
            ))}
          </div>
        </div>
        {/* dropAnimation=null avoids the overlay sliding back to the source
            slot when the item has actually moved to another column. */}
        <DragOverlay dropAnimation={null}>
          {activeFeedback ? (
            <KanbanCardOverlay
              feedback={activeFeedback}
              isSelected={selectedIds.has(activeFeedback.id)}
              selectionMode={selectedIds.size > 0}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
