import { FastMCP } from "fastmcp";
import { SunsamaClient } from "sunsama-api";
import { getStreamsSchema, getTasksBacklogSchema, getTasksByDaySchema, getUserSchema } from "./schemas.js";
import { toTsv } from "./utils/to-tsv.js";
import { getTransportConfig } from "./config/transport.js";

// Get transport configuration with validation
const transportConfig = getTransportConfig();

// For stdio transport, authenticate at startup with environment variables
let globalSunsamaClient: SunsamaClient | null = null;
if (transportConfig.transportType === "stdio") {
  if (!process.env.SUNSAMA_EMAIL || !process.env.SUNSAMA_PASSWORD) {
    throw new Error("Sunsama credentials not configured. Please set SUNSAMA_EMAIL and SUNSAMA_PASSWORD environment variables.");
  }
  globalSunsamaClient = new SunsamaClient();
  await globalSunsamaClient.login(process.env.SUNSAMA_EMAIL, process.env.SUNSAMA_PASSWORD);
}

/**
 * Session data interface for HTTP transport
 */
interface SessionData {
  sunsamaClient: SunsamaClient;
  email: string;
}

/**
 * Gets the appropriate SunsamaClient instance based on transport type
 */
function getSunsamaClient(session: SessionData | null): SunsamaClient {
  if (transportConfig.transportType === "httpStream") {
    if (!session?.sunsamaClient) {
      throw new Error("Session not available. Authentication may have failed.");
    }
    return session.sunsamaClient;
  }
  
  if (!globalSunsamaClient) {
    throw new Error("Global Sunsama client not initialized.");
  }
  return globalSunsamaClient;
}


const server = new FastMCP({
  name: "Sunsama API Server",
  version: "0.1.0",
  instructions: `
This MCP server provides access to the Sunsama API for task and project management.

Available tools:
- Authentication: login, logout, check authentication status
- User operations: get current user information
- Task operations: get tasks by day, get backlog tasks
- Stream operations: get streams/channels for the user's group

Authentication is required for all operations. You can either:
1. Login with email/password using the 'login' tool
2. Use a session token if you have one

The server maintains session state per MCP connection, so you only need to authenticate once per session.
  `.trim(),
  // dynamically handle authentication
  ...(transportConfig.transportType === "httpStream" ? {
    authenticate: async (request) => {
      const authHeader = request.headers["authorization"];
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        throw new Response(null, {
          status: 401,
          statusText: "Unauthorized: Basic Auth required",
          headers: { 'WWW-Authenticate': 'Basic realm="Sunsama MCP"' }
        });
      }

      try {
        // Parse Basic Auth credentials
        const base64Credentials = authHeader.replace('Basic ', '');
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [email, password] = credentials.split(':');

        if (!email || !password) {
          throw new Error("Invalid Basic Auth format");
        }

        // Create and authenticate SunsamaClient
        const sunsamaClient = new SunsamaClient();
        await sunsamaClient.login(email, password);
        
        console.log(`HTTP session authenticated for user: ${email}`);
        
        return {
          sunsamaClient,
          email
        };
      } catch (error) {
        console.log("Authentication failed:", error instanceof Error ? error.message : 'Unknown error');
        throw new Response(null, {
          status: 401,
          statusText: "Unauthorized: Invalid Sunsama credentials"
        });
      }
    },
  } : {})
});

// User Operations
server.addTool({
  name: "get-user",
  description: "Get current user information including profile, timezone, and group details",
  parameters: getUserSchema,
  execute: async (_args, {session, log}) => {
    try {
      log.info("Getting user information");

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Get user information
      const user = await sunsamaClient.getUser();

      log.info("Successfully retrieved user information", {userId: user._id});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(user, null, 2)
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get user information", {error: error instanceof Error ? error.message : 'Unknown error'});

      throw new Error(`Failed to get user information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Task Operations
server.addTool({
  name: "get-tasks-backlog",
  description: "Get tasks from the backlog",
  parameters: getTasksBacklogSchema,
  execute: async (_args, {session, log}) => {
    try {
      log.info("Getting backlog tasks");

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Get backlog tasks
      const tasks = await sunsamaClient.getTasksBacklog();

      log.info("Successfully retrieved backlog tasks", {count: tasks.length});

      return {
        content: [
          {
            type: "text",
            text: toTsv(tasks)
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get backlog tasks", {error: error instanceof Error ? error.message : 'Unknown error'});

      throw new Error(`Failed to get backlog tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

server.addTool({
  name: "get-tasks-by-day",
  description: "Get tasks for a specific day",
  parameters: getTasksByDaySchema,
  execute: async (args, {session, log}) => {
    try {
      log.info("Getting tasks for day", {day: args.day, timezone: args.timezone});

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // If no timezone provided, we need to get the user's default timezone
      let timezone = args.timezone;
      if (!timezone) {
        timezone = await sunsamaClient.getUserTimezone();
        log.info("Using user's default timezone", {timezone});
      }

      // Get tasks for the specified day with the determined timezone
      const tasks = await sunsamaClient.getTasksByDay(args.day, timezone);

      log.info("Successfully retrieved tasks for day", {
        day: args.day,
        count: tasks.length,
        timezone: timezone
      });

      return {
        content: [
          {
            type: "text",
            text: toTsv(tasks)
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get tasks by day", {
        day: args.day,
        timezone: args.timezone,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to get tasks for ${args.day}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Stream Operations
server.addTool({
  name: "get-streams",
  description: "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (_args, {session, log}) => {
    try {
      log.info("Getting streams for user's group");

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Get streams for the user's group
      const streams = await sunsamaClient.getStreamsByGroupId();

      log.info("Successfully retrieved streams", {count: streams.length});

      return {
        content: [
          {
            type: "text",
            text: toTsv(streams)
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get streams", {error: error instanceof Error ? error.message : 'Unknown error'});

      throw new Error(`Failed to get streams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

server.addResource({
  uri: "sunsama://api/docs",
  name: "Sunsama API Documentation",
  description: "Documentation for the Sunsama API endpoints and data structures",
  mimeType: "text/markdown",
  load: async () => {
    return {
      text: `# Sunsama MCP Server Documentation

## Overview
This MCP server provides access to the Sunsama API for task and project management.
Authentication is handled server-side using environment variables.

## Authentication
The server authenticates to Sunsama using environment variables:
- \`SUNSAMA_EMAIL\`: Your Sunsama account email
- \`SUNSAMA_PASSWORD\`: Your Sunsama account password

Authentication happens automatically on server startup. No client-side authentication is required.

## Available Tools

### User Operations
- **get-user**: Get current user information
  - Parameters: none
  - Returns: User object with profile, timezone, and primary group details

### Task Operations
- **get-tasks-by-day**: Get tasks for a specific day
  - Parameters: 
    - \`day\` (required): Date in YYYY-MM-DD format
    - \`timezone\` (optional): Timezone string (e.g., "America/New_York")
  - Returns: Array of Task objects for the specified day

- **get-tasks-backlog**: Get tasks from the backlog
  - Parameters: none  
  - Returns: Array of Task objects from the backlog

### Stream Operations
- **get-streams**: Get streams for the user's group
  - Parameters: none
  - Returns: Array of Stream objects
  - Note: Streams are called "channels" in the Sunsama UI. If a user requests channels, use this tool.

## Data Types

### User Object
\`\`\`typescript
{
  _id: string;
  email: string;
  profile: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    timezone: string;
    avatarUrl?: string;
  };
  primaryGroup?: {
    groupId: string;
    name: string;
    role?: string;
  };
}
\`\`\`

### Task Object
\`\`\`typescript
{
  _id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  completedAt?: string;
  streamId?: string;
  userId: string;
  groupId: string;
}
\`\`\`

### Stream Object
Note: Streams are called "channels" in the Sunsama UI.
\`\`\`typescript
{
  _id: string;
  name: string;
  color?: string;
  groupId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
\`\`\`

## Error Handling
- All operations require valid Sunsama authentication
- Invalid dates will return validation errors
- Network errors are handled gracefully with descriptive messages
- Server maintains session state across tool calls

## Environment Setup
Required environment variables:
- \`API_KEY\`: MCP server authentication key
- \`SUNSAMA_EMAIL\`: Sunsama account email
- \`SUNSAMA_PASSWORD\`: Sunsama account password
- \`PORT\`: Server port (default: 3000)
      `.trim()
    };
  }
});

// Log startup information
console.log(`Starting Sunsama MCP Server with transport: ${transportConfig.transportType}`);
if (transportConfig.transportType === "httpStream") {
  console.log(`HTTP Stream configuration: port=${transportConfig.httpStream?.port}, endpoint=${transportConfig.httpStream?.endpoint}`);
}

// Start server with dynamic transport configuration
if (transportConfig.transportType === "httpStream") {
  server.start({
    transportType: "httpStream",
    httpStream: {
      port: transportConfig.httpStream!.port
    }
  }).then(() => {
    console.log(`Sunsama MCP Server running on port ${transportConfig.httpStream!.port}`);
    console.log(`HTTP endpoint: ${transportConfig.httpStream!.endpoint}`);
    console.log("Authentication: HTTP Basic Auth with Sunsama credentials");
  });
} else {
  server.start({
    transportType: "stdio"
  });
  console.log("Server started with stdio transport");
}