export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export type ListFeedbacksParams = {
  status?: string;
  page_url?: string;
  env?: string;
  column?: string;
  format?: "json" | "markdown";
};

export type FeedbackJson = {
  id: string;
  status: string;
  /** Board column; null when archived. */
  column: { id: string; name: string } | null;
  tags: Record<string, string>;
  assignee: { name: string } | null;
  commentCount: number;
  comment: string;
  pageUrl: string;
  selector: string | null;
  clickX: number | null;
  clickY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  browserName: string | null;
  browserVersion: string | null;
  os: string | null;
  screenshotUrl: string | null;
  recordingUrl: string | null;
  /** Wall-clock length the widget reported at upload; null when unknown. */
  recordingDurationMs: number | null;
  reviewerName: string;
  createdAt: string;
};

export type ListFeedbacksJsonResponse = {
  feedbacks: FeedbackJson[];
  count: number;
};

export type UpdateStatusResponse = {
  id: string;
  status: string;
  column: { id: string; name: string } | null;
  updatedAt: string;
  comment: { id: string } | null;
};

export type MoveFeedbackResponse = {
  id: string;
  status: string;
  column: { id: string; name: string };
  updatedAt: string;
  comment: { id: string } | null;
};

export type BoardColumn = {
  id: string;
  name: string;
  /** The status every card in this column has. */
  status: string;
  position: number;
};

export type ListColumnsResponse = { columns: BoardColumn[] };

export type FeedbackComment = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: { type: "member" | "agent" | "former_member"; name: string };
  fromColumn: string | null;
  toColumn: string | null;
};

export type ListCommentsResponse = { comments: FeedbackComment[] };

export type CreateFeedbackInput = {
  comment: string;
  pageUrl: string;
  status?: FeedbackStatus;
  selector?: string;
  clickX?: number;
  clickY?: number;
  browserName?: string;
  browserVersion?: string;
  os?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type CreateFeedbacksParams = {
  feedbacks: CreateFeedbackInput[];
  reviewerName?: string;
  source?: string;
};

export type CreateFeedbacksResponse = {
  created: number;
  feedbacks: Array<{
    id: string;
    status: string;
    comment: string;
    pageUrl: string;
    createdAt: string;
  }>;
  reviewer: { id: string; name: string };
  atLimit: boolean;
};

export type ApiError = {
  error: string;
  code: string;
  /** Valid column names, sent with COLUMN_NOT_FOUND. */
  columns?: string[];
};
