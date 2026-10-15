import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FasterFixesClient } from "../api-client";
import { CommentBodySchema } from "../schemas";
import { errorResult, textResult } from "./tool-result";

export function registerAddComment(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "add_comment",
    {
      title: "Add Feedback Comment",
      description:
        "Add a comment to a feedback item's team thread, e.g. findings, a question for the team, or a closeout note. Visible to the team in the dashboard, never to the reviewer. Requires a token with the 'Add comments' permission. To comment while moving or resolving, pass comment to move_feedback or update_feedback_status instead.",
      inputSchema: {
        feedback_id: z.string().uuid().describe("The feedback item ID"),
        body: CommentBodySchema.describe(
          "Comment text (markdown is shown as plain text)",
        ),
      },
    },
    async ({ feedback_id, body }) => {
      try {
        const comment = await client.addComment(feedback_id, body);
        return textResult(
          `Comment ${comment.id} added to feedback ${feedback_id}.`,
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
