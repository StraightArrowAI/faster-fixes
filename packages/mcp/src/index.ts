import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FasterFixesClient } from "./api-client";
import { loadConfig } from "./config";
import { registerAddComment } from "./tools/add-comment";
import { registerCreateFeedbacks } from "./tools/create-feedbacks";
import { registerListColumns } from "./tools/list-columns";
import { registerListComments } from "./tools/list-comments";
import { registerMoveFeedback } from "./tools/move-feedback";
import { registerListFeedbacks } from "./tools/list-feedbacks";
import { registerUpdateFeedbackStatus } from "./tools/update-feedback-status";

const { token, project, baseUrl } = loadConfig();

const client = new FasterFixesClient(baseUrl, token, project);
const server = new McpServer({
  name: "faster-fixes",
  version: "0.0.6",
});

registerListFeedbacks(server, client);
registerCreateFeedbacks(server, client);
registerUpdateFeedbackStatus(server, client);
registerListColumns(server, client);
registerMoveFeedback(server, client);
registerListComments(server, client);
registerAddComment(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
