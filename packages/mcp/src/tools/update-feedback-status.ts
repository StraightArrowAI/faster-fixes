import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FasterFixesClient } from "../api-client";
import { CommentBodySchema, FeedbackStatusEnum } from "../schemas";

export function registerUpdateFeedbackStatus(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "update_feedback_status",
    {
      title: "Update Feedback Status",
      description:
        "Update the status of a feedback item. Use 'in_progress' when you start working on a fix, and 'resolved' when the fix is complete. The item lands in the first column of that status; use move_feedback to target a specific column. Add a comment to leave a closeout note for the team.",
      inputSchema: {
        feedback_id: z
          .string()
          .uuid()
          .describe("The feedback item ID to update"),
        status: FeedbackStatusEnum.describe("The new status"),
        comment: CommentBodySchema.optional().describe(
          "Optional note for the team, e.g. what was fixed and where",
        ),
      },
    },
    async ({ feedback_id, status, comment }) => {
      try {
        const result = await client.updateFeedbackStatus(
          feedback_id,
          status,
          comment,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Feedback ${result.id} status updated to "${result.status}"${result.column ? ` (column "${result.column.name}")` : ""}${result.comment ? " with a comment" : ""}.`,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
