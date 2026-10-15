import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FasterFixesClient } from "../api-client";
import { FeedbackStatusEnum } from "../schemas";

export function registerListFeedbacks(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "list_feedbacks",
    {
      title: "List Feedbacks",
      description:
        "List feedback items from Faster Fixes. Returns client feedback with its board column, tags (env is the environment), assignee, team comment count, page URL, CSS selector, click coordinates, viewport info, browser details, screenshot, an optional screen recording of the sequence that produced the defect, and the console logs and network requests captured before submission. Use format=markdown for agent-readable output. Workflow: list feedbacks → read list_comments when commentCount > 0 → fix the issues in code → move_feedback or update_feedback_status with a closeout comment.",
      inputSchema: {
        status: FeedbackStatusEnum.optional().describe(
          "Filter by feedback status",
        ),
        page_url: z
          .string()
          .url()
          .optional()
          .describe("Filter by the page URL where feedback was submitted"),
        env: z
          .string()
          .optional()
          .describe(
            "Filter by environment tag, e.g. 'dev' or 'prod'. Use 'none' for items without one",
          ),
        column: z
          .string()
          .optional()
          .describe("Filter by board column name (case-insensitive) or ID"),
        format: z
          .enum(["json", "markdown"])
          .optional()
          .default("markdown")
          .describe("Response format. Use markdown for readable output"),
      },
    },
    async ({ status, page_url, env, column, format }) => {
      try {
        const result = await client.listFeedbacks({
          status,
          page_url,
          env,
          column,
          format,
        });

        if (typeof result === "string") {
          return { content: [{ type: "text" as const, text: result }] };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
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
