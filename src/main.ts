import { FastMCP } from "fastmcp";
import type { CreateTaskOptions } from "sunsama-api";
import { httpStreamAuthenticator } from "./auth/http.js";
import { initializeStdioAuth } from "./auth/stdio.js";
import type { SessionData } from "./auth/types.js";
import { getTransportConfig } from "./config/transport.js";
import {
  createTaskSchema,
  deleteTaskSchema,
  getStreamsSchema,
  getTasksBacklogSchema,
  getTasksByDaySchema,
  getUserSchema,
  updateTaskCompleteSchema
} from "./schemas.js";
import { getSunsamaClient } from "./utils/client-resolver.js";
import { filterTasksByCompletion } from "./utils/task-filters.js";
import { trimTasksForResponse } from "./utils/task-trimmer.js";
import { toTsv } from "./utils/to-tsv.js";

// Get transport configuration with validation
const transportConfig = getTransportConfig();

// For stdio transport, authenticate at startup with environment variables
if (transportConfig.transportType === "stdio") {
  await initializeStdioAuth();
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
    authenticate: httpStreamAuthenticator,
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

      // Trim tasks to reduce response size while preserving essential data
      const trimmedTasks = trimTasksForResponse(tasks);

      log.info("Successfully retrieved backlog tasks", {count: tasks.length});

      return {
        content: [
          {
            type: "text",
            text: toTsv(trimmedTasks)
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
  description: "Get tasks for a specific day with optional filtering by completion status",
  parameters: getTasksByDaySchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract and set defaults for parameters
      const completionFilter = args.completionFilter || "all";

      log.info("Getting tasks for day", {
        day: args.day,
        timezone: args.timezone,
        completionFilter: completionFilter
      });

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

      // Apply completion filter BEFORE trimming for efficiency
      const filteredTasks = filterTasksByCompletion(tasks, completionFilter);

      // Trim tasks to reduce response size while preserving essential data
      const trimmedTasks = trimTasksForResponse(filteredTasks);

      log.info("Successfully retrieved tasks for day", {
        day: args.day,
        totalCount: tasks.length,
        filteredCount: filteredTasks.length,
        filter: completionFilter,
        timezone: timezone
      });

      return {
        content: [
          {
            type: "text",
            text: toTsv(trimmedTasks)
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get tasks by day", {
        day: args.day,
        timezone: args.timezone,
        completionFilter: args.completionFilter,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to get tasks for ${args.day}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Task Mutation Operations
server.addTool({
  name: "create-task",
  description: "Create a new task with optional properties",
  parameters: createTaskSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract parameters from args
      const {text, notes, streamIds, timeEstimate, dueDate, snoozeUntil, private: isPrivate, taskId} = args;

      log.info("Creating new task", {
        text: text,
        hasNotes: !!notes,
        streamCount: streamIds?.length || 0,
        timeEstimate: timeEstimate,
        hasDueDate: !!dueDate,
        hasSnooze: !!snoozeUntil,
        isPrivate: isPrivate,
        customTaskId: !!taskId
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Build options object for createTask
      const options: CreateTaskOptions = {};
      if (notes) options.notes = notes;
      if (streamIds) options.streamIds = streamIds;
      if (timeEstimate) options.timeEstimate = timeEstimate;
      if (dueDate) options.dueDate = dueDate;
      if (snoozeUntil) options.snoozeUntil = snoozeUntil;
      if (isPrivate !== undefined) options.private = isPrivate;
      if (taskId) options.taskId = taskId;

      // Call sunsamaClient.createTask(text, options)
      const result = await sunsamaClient.createTask(text, options);

      log.info("Successfully created task", {
        taskId: result.updatedFields?._id || 'unknown',
        title: text,
        success: result.success
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: result.success,
              taskId: result.updatedFields?._id,
              title: text,
              created: true,
              updatedFields: result.updatedFields
            })
          }
        ]
      };

    } catch (error) {
      log.error("Failed to create task", {
        text: args.text,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

server.addTool({
  name: "update-task-complete",
  description: "Mark a task as complete with optional completion timestamp",
  parameters: updateTaskCompleteSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract taskId and optional parameters
      const {taskId, completeOn, limitResponsePayload} = args;

      log.info("Marking task as complete", {
        taskId: taskId,
        hasCustomCompleteOn: !!completeOn,
        limitResponsePayload: limitResponsePayload
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Call sunsamaClient.updateTaskComplete(taskId, completeOn, limitResponsePayload)
      const result = await sunsamaClient.updateTaskComplete(
        taskId,
        completeOn,
        limitResponsePayload
      );

      log.info("Successfully marked task as complete", {
        taskId: taskId,
        success: result.success,
        updatedFields: !!result.updatedFields
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: result.success,
              taskId: taskId,
              completed: true,
              updatedFields: result.updatedFields
            })
          }
        ]
      };

    } catch (error) {
      log.error("Failed to mark task as complete", {
        taskId: args.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to mark task as complete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

server.addTool({
  name: "delete-task",
  description: "Delete a task permanently",
  parameters: deleteTaskSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract taskId and optional parameters
      const {taskId, limitResponsePayload, wasTaskMerged} = args;

      log.info("Deleting task", {
        taskId: taskId,
        limitResponsePayload: limitResponsePayload,
        wasTaskMerged: wasTaskMerged
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Call sunsamaClient.deleteTask(taskId, limitResponsePayload, wasTaskMerged)
      const result = await sunsamaClient.deleteTask(
        taskId,
        limitResponsePayload,
        wasTaskMerged
      );

      log.info("Successfully deleted task", {
        taskId: taskId,
        success: result.success
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: result.success,
              taskId: taskId,
              deleted: true,
              updatedFields: result.updatedFields
            })
          }
        ]
      };

    } catch (error) {
      log.error("Failed to delete task", {
        taskId: args.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
- **get-tasks-by-day**: Get tasks for a specific day with optional filtering
  - Parameters: 
    - \`day\` (required): Date in YYYY-MM-DD format
    - \`timezone\` (optional): Timezone string (e.g., "America/New_York")
    - \`completionFilter\` (optional): Filter by completion status
      - \`"all"\` (default): Return all tasks
      - \`"incomplete"\`: Return only incomplete tasks
      - \`"completed"\`: Return only completed tasks
  - Returns: Array of filtered Task objects for the specified day

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


// Start server with dynamic transport configuration
if (transportConfig.transportType === "httpStream") {
  // Log startup information
  console.log(`HTTP Stream configuration: port=${transportConfig.httpStream?.port}, endpoint=${transportConfig.httpStream?.endpoint}`);

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
}