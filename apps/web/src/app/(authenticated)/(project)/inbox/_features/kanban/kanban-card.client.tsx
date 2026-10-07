"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { GithubIcon } from "@workspace/ui/components/icons/github-icon";
import { resolveS3Url } from "@/server/storage/resolve-s3-url";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { GripVertical } from "lucide-react";
import type { EnvironmentColorsInput } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import { EnvironmentBadge } from "@/app/(authenticated)/(project)/_features/environment/environment-badge";
import type { FeedbackItem } from "../get-feedback.trpc.query";

type KanbanCardProps = {
  feedback: FeedbackItem;
  environmentColors: EnvironmentColorsInput;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (id: string) => void;
};

function formatPageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

type KanbanCardViewProps = {
  feedback: FeedbackItem;
  environmentColors: EnvironmentColorsInput;
  isSelected: boolean;
  selectionMode: boolean;
  isOverlay?: boolean;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
  onToggleSelect?: (id: string) => void;
  onSelect?: (id: string) => void;
};

// Pure presentational card. Used as draggable source and inside DragOverlay.
function KanbanCardView({
  feedback,
  environmentColors,
  isSelected,
  selectionMode,
  isOverlay,
  isDragging,
  dragHandle,
  onToggleSelect,
  onSelect,
}: KanbanCardViewProps) {
  const env = feedback.tags.env;

  return (
    <div
      className={cn(
        "group bg-card border-border flex cursor-pointer gap-2 rounded-lg border p-3 transition-shadow hover:shadow-sm",
        isOverlay && "cursor-grabbing shadow-lg",
        // Source stays in flow but invisible; DragOverlay shows the moving copy.
        isDragging && "invisible",
      )}
      onClick={() => {
        if (isOverlay) return;
        onSelect?.(feedback.id);
      }}
    >
      {selectionMode && (
        <div
          className="flex items-start pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(feedback.id)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 text-sm leading-snug">{feedback.comment}</p>

        {/* Both items are min-w-0 so a long host or env name truncates instead
            of widening the lane. The badge is forced to block because the
            inline-flex Badge base clips text without an ellipsis. */}
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            {formatPageUrl(feedback.pageUrl)}
          </p>
          {env && (
            <EnvironmentBadge
              environment={env}
              color={environmentColors[env]}
              className="block min-w-0 shrink"
            />
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {feedback.assignee ? (
            <Avatar className="size-5">
              <AvatarImage
                src={
                  feedback.assignee.image
                    ? resolveS3Url(feedback.assignee.image)
                    : undefined
                }
                className="object-cover"
              />
              <AvatarFallback className="text-[10px]">
                {feedback.assignee.name?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="bg-muted size-5 rounded-full" />
          )}

          <span className="text-muted-foreground truncate text-xs">
            {feedback.reviewer.name}
          </span>

          {feedback.issueLink && (
            <GithubIcon className="text-muted-foreground size-3.5 shrink-0" />
          )}

          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {formatDistanceToNow(new Date(feedback.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {dragHandle}
    </div>
  );
}

export function KanbanCard({
  feedback,
  environmentColors,
  isSelected,
  selectionMode,
  onToggleSelect,
  onSelect,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: feedback.id,
    data: { feedback },
  });

  const handle = (
    <div
      className="text-muted-foreground hidden shrink-0 cursor-grab items-center opacity-0 transition-opacity group-hover:opacity-100 lg:flex"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-4" />
    </div>
  );

  return (
    <div ref={setNodeRef}>
      <KanbanCardView
        feedback={feedback}
        environmentColors={environmentColors}
        isSelected={isSelected}
        selectionMode={selectionMode}
        isDragging={isDragging}
        dragHandle={handle}
        onToggleSelect={onToggleSelect}
        onSelect={onSelect}
      />
    </div>
  );
}

type KanbanCardOverlayProps = {
  feedback: FeedbackItem;
  environmentColors: EnvironmentColorsInput;
  isSelected: boolean;
  selectionMode: boolean;
};

export function KanbanCardOverlay({
  feedback,
  environmentColors,
  isSelected,
  selectionMode,
}: KanbanCardOverlayProps) {
  return (
    <KanbanCardView
      feedback={feedback}
      environmentColors={environmentColors}
      isSelected={isSelected}
      selectionMode={selectionMode}
      isOverlay
    />
  );
}
