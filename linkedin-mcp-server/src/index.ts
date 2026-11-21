#!/usr/bin/env node
/**
 * LinkedIn MCP Server
 * Automated publishing, media uploads, scheduling queue, formatting, and analytics.
 */
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { CONFIG } from "./constants.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerPostTools } from "./tools/posts.js";
import { registerMediaTools } from "./tools/media.js";
import { registerScheduleTools } from "./tools/schedule.js";
import { registerEngagementTools } from "./tools/engagement.js";
import { registerFormatTools } from "./tools/format.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

/**
 * Server factory: returns a fresh McpServer instance on every invocation.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "linkedin-mcp-server",
    version: "1.0.0",
  });

  // Register all tools
  registerProfileTools(server);
  registerPostTools(server);
  registerMediaTools(server);
  registerScheduleTools(server);
  registerEngagementTools(server);
  registerFormatTools(server);

  // Register resources and prompts
  registerResources(server);
  registerPrompts(server);

  return server;
}

// Transport bootstrap
if (CONFIG.transport === "http") {
  const handler = createMcpHandler(createServer);
  const app = createMcpExpressApp();
  const nodeHandler = toNodeHandler(handler);

  app.all("/mcp", (req, res) => void nodeHandler(req, res, req.body));

  const port = CONFIG.port;
  app.listen(port, "127.0.0.1", () => {
    console.error(`linkedin-mcp-server listening on http://127.0.0.1:${port}/mcp`);
  });
} else {
  serveStdio(createServer);
  console.error("linkedin-mcp-server running on stdio");
}
