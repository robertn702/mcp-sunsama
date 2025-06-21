#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import type { CreateTaskOptions } from "sunsama-api";
import { httpStreamAuthenticator } from "./auth/http.js";
import { initializeStdioAuth } from "./auth/stdio.js";
import type { SessionData } from "./auth/types.js";
import { getTransportConfig } from "./config/transport.js";
import {
  createTaskSchema,
  deleteTaskSchema,
  getArchivedTasksSchema,
  getStreamsSchema,
  getTasksBacklogSchema,
  getTasksByDaySchema,
  getUserSchema,
  updateTaskBacklogSchema,
  updateTaskCompleteSchema,
  updateTaskSnoozeDateSchema
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
  version: "0.5.2",
  instructions: `
This MCP server provides access to the Sunsama API for task and project management.

Available tools:
- Authentication: login, logout, check authentication status
- User operations: get current user information
- Task operations: get tasks by day, get backlog tasks, get archived tasks
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

server.addTool({
  name: "get-archived-tasks",
  description: "Get archived tasks with optional pagination",
  parameters: getArchivedTasksSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract and set defaults for parameters
      const offset = args.offset || 0;
      const requestedLimit = args.limit || 100;
      
      // Fetch limit + 1 to determine if there are more results
      const fetchLimit = requestedLimit + 1;

      log.info("Getting archived tasks", {
        offset,
        requestedLimit,
        fetchLimit
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Get archived tasks (fetch limit + 1 to check for more)
      const allTasks = await sunsamaClient.getArchivedTasks(offset, fetchLimit);

      // Determine if there are more results and slice to requested limit
      const hasMore = allTasks.length > requestedLimit;
      const tasks = hasMore ? allTasks.slice(0, requestedLimit) : allTasks;

      // Trim tasks to reduce response size while preserving essential data
      const trimmedTasks = trimTasksForResponse(tasks);

      // Create pagination metadata
      const paginationInfo = {
        offset,
        limit: requestedLimit,
        count: tasks.length,
        hasMore,
        nextOffset: hasMore ? offset + requestedLimit : null
      };

      log.info("Successfully retrieved archived tasks", {
        totalReturned: tasks.length,
        hasMore,
        offset,
        requestedLimit
      });

      // Create response with pagination metadata header and TSV data
      const responseText = `# Pagination: offset=${paginationInfo.offset}, limit=${paginationInfo.limit}, count=${paginationInfo.count}, hasMore=${paginationInfo.hasMore}, nextOffset=${paginationInfo.nextOffset || 'null'}
${toTsv(trimmedTasks)}`;

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };

    } catch (error) {
      log.error("Failed to get archived tasks", {
        offset: args.offset,
        limit: args.limit,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to get archived tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

server.addTool({
  name: "update-task-snooze-date",
  description: "Update task snooze date to reschedule tasks or move them to backlog",
  parameters: updateTaskSnoozeDateSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract parameters
      const {taskId, newDay, timezone, limitResponsePayload} = args;

      log.info("Updating task snooze date", {
        taskId: taskId,
        newDay: newDay,
        timezone: timezone,
        limitResponsePayload: limitResponsePayload
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Build options object
      const options: {
        timezone?: string;
        limitResponsePayload?: boolean;
      } = {};
      if (timezone) options.timezone = timezone;
      if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

      // Call sunsamaClient.updateTaskSnoozeDate(taskId, newDay, options)
      const result = await sunsamaClient.updateTaskSnoozeDate(
        taskId,
        newDay,
        options
      );

      log.info("Successfully updated task snooze date", {
        taskId: taskId,
        newDay: newDay,
        success: result.success
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: result.success,
              taskId: taskId,
              newDay: newDay,
              updatedFields: result.updatedFields
            })
          }
        ]
      };

    } catch (error) {
      log.error("Failed to update task snooze date", {
        taskId: args.taskId,
        newDay: args.newDay,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to update task snooze date: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

server.addTool({
  name: "update-task-backlog",
  description: "Move a task to the backlog",
  parameters: updateTaskBacklogSchema,
  execute: async (args, {session, log}) => {
    try {
      // Extract parameters
      const {taskId, timezone, limitResponsePayload} = args;

      log.info("Moving task to backlog", {
        taskId: taskId,
        timezone: timezone,
        limitResponsePayload: limitResponsePayload
      });

      // Get the appropriate client based on transport type
      const sunsamaClient = getSunsamaClient(session as SessionData | null);

      // Build options object
      const options: {
        timezone?: string;
        limitResponsePayload?: boolean;
      } = {};
      if (timezone) options.timezone = timezone;
      if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

      // Call sunsamaClient.updateTaskSnoozeDate(taskId, null, options) to move to backlog
      const result = await sunsamaClient.updateTaskSnoozeDate(
        taskId,
        null,
        options
      );

      log.info("Successfully moved task to backlog", {
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
              movedToBacklog: true,
              updatedFields: result.updatedFields
            })
          }
        ]
      };

    } catch (error) {
      log.error("Failed to move task to backlog", {
        taskId: args.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to move task to backlog: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
This MCP server provides comprehensive access to the Sunsama API for task and project management.
Supports dual transport modes with different authentication strategies.

## Transport Modes

### Stdio Transport (Default)
- Single global authentication using environment variables
- Session maintained for entire server lifetime
- Best for single-user local development

### HTTP Stream Transport  
- Per-request authentication via HTTP Basic Auth
- Session-isolated client instances
- Supports multiple concurrent users

## Authentication

### Stdio Transport
Uses environment variables (authenticated once at startup):
- \`SUNSAMA_EMAIL\`: Your Sunsama account email
- \`SUNSAMA_PASSWORD\`: Your Sunsama account password

### HTTP Stream Transport
Uses HTTP Basic Auth headers (per-request authentication):
- \`Authorization: Basic <base64(email:password)>\`
- Credentials provided in each HTTP request

## Available Tools

### User Operations
- **get-user**: Get current user information
  - Parameters: none
  - Returns: User object with profile, timezone, and primary group details

### Task Management
- **get-tasks-by-day**: Get tasks for a specific day with optional filtering
  - Parameters: 
    - \`day\` (required): Date in YYYY-MM-DD format
    - \`timezone\` (optional): Timezone string (e.g., "America/New_York")
    - \`completionFilter\` (optional): Filter by completion status ("all", "incomplete", "completed")
  - Returns: TSV of filtered Task objects for the specified day

- **get-tasks-backlog**: Get tasks from the backlog
  - Parameters: none  
  - Returns: TSV of Task objects from the backlog

- **get-archived-tasks**: Get archived tasks with optional pagination
  - Parameters:
    - \`offset\` (optional): Pagination offset (defaults to 0)
    - \`limit\` (optional): Maximum number of tasks to return (defaults to 100, max: 1000)
  - Returns: TSV of trimmed archived Task objects with pagination metadata header
  - Pagination: Uses limit+1 pattern to determine if more results are available

- **create-task**: Create a new task with optional properties
  - Parameters:
    - \`text\` (required): Task title/description
    - \`notes\` (optional): Additional task notes
    - \`streamIds\` (optional): Array of stream IDs to associate with task
    - \`timeEstimate\` (optional): Time estimate in minutes
    - \`dueDate\` (optional): Due date string (ISO format)
    - \`snoozeUntil\` (optional): Snooze until date string (ISO format)
    - \`private\` (optional): Whether the task is private
    - \`taskId\` (optional): Custom task ID
  - Returns: JSON with task creation result

- **update-task-complete**: Mark a task as complete
  - Parameters:
    - \`taskId\` (required): The ID of the task to mark as complete
    - \`completeOn\` (optional): Completion timestamp (ISO format)
    - \`limitResponsePayload\` (optional): Whether to limit response size
  - Returns: JSON with completion result

- **delete-task**: Delete a task permanently
  - Parameters:
    - \`taskId\` (required): The ID of the task to delete
    - \`limitResponsePayload\` (optional): Whether to limit response size
    - \`wasTaskMerged\` (optional): Whether the task was merged before deletion
  - Returns: JSON with deletion result

- **update-task-snooze-date**: Reschedule tasks or move to backlog
  - Parameters:
    - \`taskId\` (required): The ID of the task to reschedule
    - \`newDay\` (required): Target date in YYYY-MM-DD format, or null for backlog
    - \`timezone\` (optional): Timezone string
    - \`limitResponsePayload\` (optional): Whether to limit response size
  - Returns: JSON with update result

### Stream Operations
- **get-streams**: Get streams for the user's group
  - Parameters: none
  - Returns: TSV of Stream objects
  - Note: Streams are called "channels" in the Sunsama UI

## Response Optimization
- **Task Filtering**: Applied before processing for efficiency
- **Task Trimming**: Removes non-essential fields, reducing payload by 60-80%
- **TSV Format**: Used for arrays to optimize data processing

## Environment Setup

### Required (Stdio Transport)
- \`SUNSAMA_EMAIL\`: Sunsama account email
- \`SUNSAMA_PASSWORD\`: Sunsama account password

### Optional Configuration
- \`TRANSPORT_TYPE\`: "stdio" (default) | "httpStream" 
- \`PORT\`: Server port for HTTP transport (default: 3002)

## Error Handling
- Comprehensive parameter validation using Zod schemas
- Graceful handling of network errors with descriptive messages
- Session-specific error isolation in HTTP transport mode
- Proper authentication error responses
      `.trim()
    };
  }
});


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