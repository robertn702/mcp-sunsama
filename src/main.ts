#!/usr/bin/env node
// Try root import first, fallback to subpath if needed
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeStdioAuth } from "./auth/stdio.js";
import { allTools } from "./tools/index.js";
import { apiDocumentationResource } from "./resources/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Async IIFE for top-level await and error handling
(async () => {
  await initializeStdioAuth();

  const server = new McpServer({
    name: "Sunsama API Server",
    version: "0.13.0",
    instructions: `
This MCP server provides access to the Sunsama API for task and project management.

Available tools:
- Authentication: login, logout, check authentication status
- User operations: get current user information
- Task operations: get tasks by day, get backlog tasks, get archived tasks, get task by ID
- Task mutations: create tasks, mark complete, delete tasks, reschedule tasks, update planned time, update task notes, update task due date, update task text, update task stream assignment
- Stream operations: get streams/channels for the user's group

Authentication is required for all operations. You can either:
1. Login with email/password using the 'login' tool
2. Use a session token if you have one

The server maintains session state per MCP connection, so you only need to authenticate once per session.
    `.trim(),
  });

  // Register all tools with correct arguments
  allTools.forEach((tool) => {
    if (typeof tool.execute === "function") {
      // Wrap execute to ensure MCP response format
      const wrappedExecute = async (args: any, extra: any) => {
        const result = await tool.execute(args);
        // Ensure result is an object with 'content' array of correct type
        if (result && Array.isArray(result.content)) {
          return {
            ...result,
            content: result.content.map((item: any) => ({
              ...item,
              type: "text",
              text: item.text ?? JSON.stringify(item, null, 2),
            })),
          };
        }
        // Fallback: wrap result in content array
        return {
          content: [
            {
              type: "text",
              text: typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2),
            } as { [x: string]: unknown; type: "text"; text: string },
          ],
        };
      };
      server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: "shape" in tool.parameters
          ? tool.parameters.shape
          : tool.parameters,
      }, wrappedExecute);
    }
  });

  const transport = new StdioServerTransport();

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

  // Start server with dynamic transport configuration
  try {
    await server.connect(transport);
  } catch (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
})();
