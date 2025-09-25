#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import { httpStreamAuthenticator } from "./auth/http.js";
import { initializeStdioAuth } from "./auth/stdio.js";
import { getTransportConfig } from "./config/transport.js";
import { allTools } from "./tools/index.js";
import { apiDocumentationResource } from "./resources/index.js";

// Get transport configuration with validation
const transportConfig = getTransportConfig();

// For stdio transport, authenticate at startup with environment variables
if (transportConfig.transportType === "stdio") {
  await initializeStdioAuth();
}

const server = new FastMCP({
  name: "Sunsama API Server",
  version: "0.14.0",
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
  // dynamically handle authentication
  ...(transportConfig.transportType === "httpStream" ? {
    authenticate: httpStreamAuthenticator,
  } : {})
});

// Register all tools
allTools.forEach(tool => server.addTool(tool));

// Register resources
server.addResource(apiDocumentationResource);



// Start server with dynamic transport configuration
if (transportConfig.transportType === "httpStream") {
  // Log startup information
  console.log(`HTTP Stream configuration: port=${transportConfig.httpStream?.port}, endpoint=${transportConfig.httpStream?.endpoint}`);

  server.start(transportConfig).then(() => {
    console.log(`Sunsama MCP Server running on port ${transportConfig.httpStream!.port}`);
    console.log(`HTTP endpoint: ${transportConfig.httpStream!.endpoint}`);
    console.log("Authentication: HTTP Basic Auth with Sunsama credentials");
  });
} else {
  server.start(transportConfig);
}