#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTransportConfig } from "./config/transport.js";
import { setupStdioTransport } from "./transports/stdio.js";
import { setupHttpTransport } from "./transports/http.js";
import { allTools } from "./tools/index.js";
import { apiDocumentationResource } from "./resources/index.js";

// Async IIFE for top-level await and error handling
(async () => {
  const server = new McpServer({
    name: "Sunsama API Server",
    version: "0.15.4",
    instructions: `
This MCP server provides access to the Sunsama API for task and project management.

Supports both stdio and HTTP stream transports.

Available tools:
- User operations: get current user information
- Task operations: get tasks by day, get backlog tasks, get archived tasks, get task by ID
- Task mutations: create tasks, mark complete, delete tasks, reschedule tasks, update planned time, update task notes, update task due date, update task text, update task stream assignment
- Stream operations: get streams/channels for the user's group

Authentication:
- Stdio transport: Uses SUNSAMA_EMAIL and SUNSAMA_PASSWORD from environment
- HTTP transport: Requires HTTP Basic Auth with Sunsama credentials
    `.trim(),
  });

  // Register all tools
  allTools.forEach((tool) => {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: "shape" in tool.parameters
          ? tool.parameters.shape
          : tool.parameters,
      },
      tool.execute,
    );
  });

  // Register resources
  server.registerResource(
    apiDocumentationResource.name,
    apiDocumentationResource.uri,
    {
      title: apiDocumentationResource.name,
      description: apiDocumentationResource.description,
      mimeType: apiDocumentationResource.mimeType,
    },
    apiDocumentationResource.load,
  );

  // Transport selection
  const config = getTransportConfig();

  try {
    if (config.transportType === "http") {
      await setupHttpTransport(server, config);
    } else {
      await setupStdioTransport(server);
    }
  } catch (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
})();
