import type {
  ApiError,
  CreateFeedbacksParams,
  CreateFeedbacksResponse,
  FeedbackComment,
  ListColumnsResponse,
  ListCommentsResponse,
  ListFeedbacksJsonResponse,
  ListFeedbacksParams,
  MoveFeedbackResponse,
  UpdateStatusResponse,
} from "./api-types";

export class FasterFixesClient {
  constructor(
    private baseUrl: string,
    private token: string,
    private projectId: string,
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiError | null;
      const message =
        body?.error ?? `API error: ${res.status} ${res.statusText}`;
      // Surfacing the valid names lets the agent fix a column guess itself.
      throw new Error(
        body?.columns
          ? `${message}. Available columns: ${body.columns.join(", ")}`
          : message,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/markdown")) {
      return (await res.text()) as T;
    }

    return res.json() as Promise<T>;
  }

  async listFeedbacks(
    params?: ListFeedbacksParams,
  ): Promise<ListFeedbacksJsonResponse | string> {
    const searchParams = new URLSearchParams();
    searchParams.set("project", this.projectId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page_url) searchParams.set("page_url", params.page_url);
    if (params?.env) searchParams.set("env", params.env);
    if (params?.column) searchParams.set("column", params.column);
    if (params?.format) searchParams.set("format", params.format);

    const format = params?.format ?? "json";
    if (format === "markdown") {
      return this.request<string>(
        `/api/v1/agent/feedbacks?${searchParams.toString()}`,
      );
    }

    return this.request<ListFeedbacksJsonResponse>(
      `/api/v1/agent/feedbacks?${searchParams.toString()}`,
    );
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: string,
    comment?: string,
  ): Promise<UpdateStatusResponse> {
    return this.request<UpdateStatusResponse>(
      `/api/v1/agent/feedbacks/${feedbackId}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status, ...(comment ? { comment } : {}) }),
      },
    );
  }

  async listColumns(): Promise<ListColumnsResponse> {
    const searchParams = new URLSearchParams({ project: this.projectId });
    return this.request<ListColumnsResponse>(
      `/api/v1/agent/columns?${searchParams.toString()}`,
    );
  }

  async moveFeedback(
    feedbackId: string,
    column: string,
    comment?: string,
  ): Promise<MoveFeedbackResponse> {
    return this.request<MoveFeedbackResponse>(
      `/api/v1/agent/feedbacks/${feedbackId}/column`,
      {
        method: "POST",
        body: JSON.stringify({ column, ...(comment ? { comment } : {}) }),
      },
    );
  }

  async listComments(feedbackId: string): Promise<ListCommentsResponse> {
    return this.request<ListCommentsResponse>(
      `/api/v1/agent/feedbacks/${feedbackId}/comments`,
    );
  }

  async addComment(feedbackId: string, body: string): Promise<FeedbackComment> {
    return this.request<FeedbackComment>(
      `/api/v1/agent/feedbacks/${feedbackId}/comments`,
      { method: "POST", body: JSON.stringify({ body }) },
    );
  }

  async createFeedbacks(
    params: CreateFeedbacksParams,
  ): Promise<CreateFeedbacksResponse> {
    return this.request<CreateFeedbacksResponse>(`/api/v1/agent/feedbacks`, {
      method: "POST",
      body: JSON.stringify({
        project: this.projectId,
        feedbacks: params.feedbacks,
        ...(params.reviewerName ? { reviewer_name: params.reviewerName } : {}),
        ...(params.source ? { source: params.source } : {}),
      }),
    });
  }
}
