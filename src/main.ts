#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTransportConfig } from "./config/transport.js";
import { setupStdioTransport } from "./transports/stdio.js";
import { setupHttpTransport } from "./transports/http.js";
import { allTools } from "./tools/index.js";
import { apiDocumentationResource } from "./resources/index.js";
import { VERSION, SERVER_NAME } from "./constants.js";

// Async IIFE for top-level await and error handling
(async () => {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: VERSION,
    },
    {
      instructions: [
        "This MCP server provides access to the Sunsama API for task and project management.",
        "Supports both stdio and HTTP stream transports.",
        "",
        "Available tools:",
        ...allTools.map((t) => `- ${t.name}: ${t.description}`),
        "",
        "Authentication:",
        "- Stdio transport: Uses SUNSAMA_EMAIL + SUNSAMA_PASSWORD, or SUNSAMA_SESSION_TOKEN",
        "- HTTP transport: HTTP Basic Auth (email:password) or Bearer token",
      ].join("\n"),
    },
  );

  // Register all tools
  for (const tool of allTools) {
    // @ts-expect-error -- ZodRawShapeCompat generic causes TS2589 with dynamic tool registration
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      tool.execute,
    );
  }

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
