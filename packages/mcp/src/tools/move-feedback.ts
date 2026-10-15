import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FasterFixesClient } from "../api-client";
import { CommentBodySchema } from "../schemas";
import { errorResult, textResult } from "./tool-result";

export function registerMoveFeedback(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "move_feedback",
    {
      title: "Move Feedback to Column",
      description:
        "Move a feedback item to a board column, such as 'In Test'. The item's status becomes the column's status. Prefer this over update_feedback_status when the project has several columns per status. Add a comment to record what you did; it appears in the team's comment thread with the move.",
      inputSchema: {
        feedback_id: z.string().uuid().describe("The feedback item ID"),
        column: z
          .string()
          .min(1)
          .describe("Column name (case-insensitive) or ID, from list_columns"),
        comment: CommentBodySchema.optional().describe(
          "Optional note for the team, e.g. what was fixed and where",
        ),
      },
    },
    async ({ feedback_id, column, comment }) => {
      try {
        const result = await client.moveFeedback(feedback_id, column, comment);
        return textResult(
          `Feedback ${result.id} moved to "${result.column.name}" (status: ${result.status})${result.comment ? " with a comment" : ""}.`,
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
