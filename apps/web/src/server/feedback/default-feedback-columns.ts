import type { FeedbackColumnCategory } from "@/types/feedback-status";

// Mirrors the fixed board that predates configurable columns, and the rows the
// add_feedback_columns migration seeded for existing projects.
export const DEFAULT_FEEDBACK_COLUMNS: {
  name: string;
  category: FeedbackColumnCategory;
  position: number;
}[] = [
  { name: "New", category: "new", position: 0 },
  { name: "In Progress", category: "in_progress", position: 1 },
  { name: "Resolved", category: "resolved", position: 2 },
];
