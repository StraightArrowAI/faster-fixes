"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Maximize2 } from "lucide-react";

type RecordingPlayerProps = {
  src: string;
  durationMs: number | null;
};

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function RecordingPlayer({ src, durationMs }: RecordingPlayerProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* preload="metadata" — the panel lists every report, so fetching only
          headers keeps opening one from pulling megabytes of video nobody
          pressed play on. */}
      <video
        src={src}
        controls
        preload="metadata"
        className="w-full rounded-md border"
      />
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{durationMs !== null ? formatDuration(durationMs) : ""}</span>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="hover:text-foreground inline-flex cursor-pointer items-center gap-1"
            >
              <Maximize2 className="size-3" />
              Expand
            </button>
          </DialogTrigger>
          <DialogContent className="h-[calc(100vh-2rem)] overflow-auto rounded-none border-none p-0 sm:max-w-[calc(100%-2rem)]">
            <DialogTitle className="sr-only">Screen recording</DialogTitle>
            <DialogDescription className="sr-only">
              Full-size screen recording for this feedback
            </DialogDescription>
            <video
              src={src}
              controls
              autoPlay
              className="h-full w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
