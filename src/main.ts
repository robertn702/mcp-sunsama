import { FastMCP } from "fastmcp";
import { z } from "zod";
import { SunsamaClient } from "sunsama-api";

const server = new FastMCP({
  name: "Sunsama API Server",
  version: "0.1.0",
  instructions: `
This MCP server provides access to the Sunsama API for task and project management.

Available tools:
- Authentication: login, logout, check authentication status
- User operations: get current user information
- Task operations: get tasks by day, get backlog tasks
- Stream operations: get streams for the user's group

Authentication is required for all operations. You can either:
1. Login with email/password using the 'login' tool
2. Use a session token if you have one

The server maintains session state per MCP connection, so you only need to authenticate once per session.
  `.trim(),
  authenticate: (request) => {
    console.log("Authentication request headers:", {
      'x-api-key': request.headers["x-api-key"] ? '[PRESENT]' : '[MISSING]',
      'authorization': request.headers["authorization"] ? '[PRESENT]' : '[MISSING]'
    });

    const apiKey = request.headers["x-api-key"];
    const bearerToken = request.headers["authorization"]?.replace("Bearer ", "");
    const expectedKey = process.env["API_KEY"];

    console.log("Expected API key present:", expectedKey ? '[PRESENT]' : '[MISSING]');

    if (apiKey === expectedKey || bearerToken === expectedKey) {
      console.log("Authentication successful");
      // Return session data that will be available in tool contexts
      return Promise.resolve({
        // Each MCP session gets its own SunsamaClient instance
        sunsamaClient: new SunsamaClient(),
        sessionId: Date.now().toString()
      });
    }

    console.log("Authentication failed");
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized",
    });
  },
});

// TODO: Add authentication tools (login, logout, is-authenticated)
// TODO: Add user tools (get-user)
// TODO: Add task tools (get-tasks-by-day, get-tasks-backlog)
// TODO: Add stream tools (get-streams)

// TODO: Add resource for API documentation
server.addResource({
  uri: "sunsama://api/docs",
  name: "Sunsama API Documentation",
  description: "Documentation for the Sunsama API endpoints and data structures",
  mimeType: "text/markdown",
  load: async () => {
    return {
      text: `# Sunsama API Documentation

## Available Operations

### Authentication
- **login**: Authenticate with email and password
- **logout**: Clear the current session
- **is-authenticated**: Check if currently authenticated

### User Operations
- **get-user**: Get current user information including profile and group details

### Task Operations
- **get-tasks-by-day**: Get tasks for a specific day
- **get-tasks-backlog**: Get tasks from the backlog

### Stream Operations
- **get-streams**: Get streams for the user's group

## Data Types

### User
Contains user profile information, timezone, and primary group details.

### Task
Contains task information including title, description, status, dates, and associated streams.

### Stream
Contains stream/project information including name, color, and configuration.

## Error Handling

All operations may throw authentication errors if not properly logged in.
Use the \`login\` tool first to establish a session.
      `.trim()
    };
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

server
  .start({
    transportType: "httpStream",
    httpStream: {
      port: PORT,
    }
  })
  .then(() => {
    console.log(`Sunsama MCP Server running on port ${PORT}`);
    console.log("Environment check:");
    console.log("- API_KEY:", process.env["API_KEY"] ? "[PRESENT]" : "[MISSING]");
    console.log("- PORT:", PORT);
    console.log("");
    console.log("Server capabilities:");
    console.log("- Authentication: API key via x-api-key header or Bearer token");
    console.log("- Transport: HTTP streaming");
    console.log("- Session management: Per-connection SunsamaClient instances");
    console.log("");
    console.log("Development commands:");
    console.log("- Test: npx fastmcp dev src/main.ts");
    console.log("- Inspect: npx fastmcp inspect src/main.ts");
  });