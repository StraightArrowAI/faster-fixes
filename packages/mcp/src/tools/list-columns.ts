import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FasterFixesClient } from "../api-client";
import { errorResult, textResult } from "./tool-result";

export function registerListColumns(
  server: McpServer,
  client: FasterFixesClient,
) {
  server.registerTool(
    "list_columns",
    {
      title: "List Board Columns",
      description:
        "List the project's board columns in board order. Each column belongs to one status (new, in_progress, resolved); a project can have several columns per status, such as 'In Progress' and 'In Test'. Use a column name with move_feedback.",
      inputSchema: {},
    },
    async () => {
      try {
        const { columns } = await client.listColumns();
        const lines = columns.map(
          (c) => `- ${c.name} (status: ${c.status}, id: ${c.id})`,
        );
        return textResult(
          lines.length > 0 ? lines.join("\n") : "No columns found.",
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
