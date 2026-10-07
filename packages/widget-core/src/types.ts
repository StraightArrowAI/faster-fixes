export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "middle-right"
  | "middle-left";

export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export type ScreenshotLimits = {
  /** Hard byte ceiling the server will accept. Deployment-dependent — always
   *  read it from the config endpoint, never hard-code a number. */
  maxBytes: number;
  /** Accepted MIME types, e.g. ["image/png", "image/jpeg", "image/webp"]. */
  allowedTypes: string[];
};

export type RecordingEncodingHint = {
  /** Pass to `new MediaRecorder(stream, { videoBitsPerSecond })`. */
  videoBitsPerSecond: number;
  /** Request via `getDisplayMedia({ video: { frameRate } })`. For mostly-static
   *  screen content this reduces size far more than bitrate alone. */
  frameRate: number;
};

export type RecordingLimits = {
  /** Hard byte ceiling the server will accept. Deployment-dependent — always
   *  read it from the config endpoint, never hard-code a number. */
  maxBytes: number;
  /** Stop recording at this length. The primary size control. */
  maxDurationMs: number;
  /** Base MIME types accepted, e.g. ["video/webm", "video/mp4"]. Compare the
   *  part before ";" — MediaRecorder appends codec parameters. */
  allowedTypes: string[];
  /** Full type strings to try with `MediaRecorder.isTypeSupported()` in order,
   *  best compression first. Use the first supported entry; never hardcode one.
   *  Every entry's base type is in `allowedTypes`. */
  preferredTypes: string[];
  recommendedEncoding: RecordingEncodingHint;
};

export type WidgetConfig = {
  enabled: boolean;
  branding: boolean;
  /** Absent on older servers — fall back to the widget's previous behaviour of
   *  uploading whatever it captured and handling a 413. */
  screenshot?: ScreenshotLimits;
  /** Absent on backends that do not support screen recording (the marketing
   *  demo client, older servers) — treat that as "recording unavailable". */
  recording?: RecordingLimits;
};

export type FeedbackReviewer = {
  id: string;
  name: string;
};

export type FeedbackItem = {
  id: string;
  status: FeedbackStatus;
  comment: string;
  pageUrl: string;
  clickX: number | null;
  clickY: number | null;
  selector: string | null;
  screenshotUrl: string | null;
  /** Presigned URL for the Feedback's screen recording, when one was attached.
   *  Optional so alternative FeedbackClient implementations (the marketing demo,
   *  test doubles) need not model recordings at all. */
  recordingUrl?: string | null;
  reviewer: FeedbackReviewer;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

export type FeedbackListResponse = {
  feedback: FeedbackItem[];
};

export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export type ConsoleEntry = {
  level: ConsoleLevel;
  message: string;
  timestamp: number;
};

export type NetworkEntry = {
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
};

export type DiagnosticTrail = {
  console: ConsoleEntry[];
  network: NetworkEntry[];
};

export type CreateFeedbackData = {
  comment: string;
  pageUrl: string;
  selector?: string;
  clickX?: number;
  clickY?: number;
  browserName?: string;
  browserVersion?: string;
  os?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  metadata?: Record<string, unknown>;
  diagnosticTrail?: DiagnosticTrail;
  /** Merged over the client-level `tags`. Tags derived from the project's
   *  domain rules override both on conflict. */
  tags?: Record<string, string>;
};

export type UpdateFeedbackData = {
  comment: string;
};

export type CreateFeedbackResponse = FeedbackItem;

export type UpdateFeedbackResponse = {
  id: string;
  comment: string;
  updatedAt: string;
};

export type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

/**
 * Common shape implemented by any feedback backend. The default
 * implementation is `FasterFixesClient` (HTTP against the hosted API);
 * alternative implementations can target localStorage, in-memory state,
 * or a mock for tests.
 */
export interface FeedbackClient {
  getConfig(): Promise<WidgetConfig>;
  getFeedback(
    reviewerToken: string,
    url?: string,
  ): Promise<FeedbackListResponse>;
  createFeedback(
    data: CreateFeedbackData,
    reviewerToken: string,
    screenshot?: Blob,
  ): Promise<CreateFeedbackResponse>;
  updateFeedback(
    id: string,
    data: UpdateFeedbackData,
    reviewerToken: string,
  ): Promise<UpdateFeedbackResponse>;
  deleteFeedback(id: string, reviewerToken: string): Promise<void>;
  attachScreenshot(
    feedbackId: string,
    screenshot: Blob,
    reviewerToken: string,
  ): Promise<void>;
}
