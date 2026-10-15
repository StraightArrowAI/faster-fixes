import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FasterFixesClient } from "../api-client";
import { errorResult, textResult } from "./tool-result";

export function registerListComments(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "list_comments",
    {
      title: "List Feedback Comments",
      description:
        "Read the team's comment thread on a feedback item, oldest first. Comments are written by team members and agents, never by the reviewer who reported the issue, and often hold context such as reproduction notes or earlier fix attempts.",
      inputSchema: {
        feedback_id: z.string().uuid().describe("The feedback item ID"),
      },
    },
    async ({ feedback_id }) => {
      try {
        const { comments } = await client.listComments(feedback_id);
        if (comments.length === 0) return textResult("No comments yet.");
        const text = comments
          .map((c) => {
            const who =
              c.author.type === "agent"
                ? `${c.author.name} (agent)`
                : c.author.name;
            const move = c.toColumn
              ? ` — moved ${c.fromColumn ? `${c.fromColumn} → ` : "to "}${c.toColumn}`
              : "";
            return `**${who}** · ${c.createdAt}${move}\n\n${c.body}`;
          })
          .join("\n\n---\n\n");
        return textResult(text);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
