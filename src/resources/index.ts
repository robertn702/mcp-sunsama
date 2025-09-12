export const apiDocumentationResource = {
  uri: "sunsama://api/docs",
  name: "Sunsama API Documentation",
  description:
    "Documentation for the Sunsama API endpoints and data structures",
  mimeType: "text/markdown",
  load: async (uri: URL, _args: any) => {
    return {
      contents: [{
        uri: uri.href,
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

- **get-task-by-id**: Get a specific task by its ID
  - Parameters:
    - \`taskId\` (required): The ID of the task to retrieve
  - Returns: JSON with complete Task object if found, or null if not found

- **create-task**: Create a new task with optional properties
  - Parameters:
    - \`text\` (required): Task title/description
    - \`notes\` (optional): Additional task notes
    - \`streamIds\` (optional): Array of stream IDs to associate with task
    - \`timeEstimate\` (optional): Time estimate in minutes
    - \`dueDate\` (optional): Due date string (ISO format)
    - \`snoozeUntil\` (optional): Snooze until date string (ISO format) - the date the task is scheduled for
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

- **update-task-notes**: Update task notes content
  - Parameters:
    - \`taskId\` (required): The ID of the task to update notes for
    - \`html\` (required XOR): HTML content for the task notes
    - \`markdown\` (required XOR): Markdown content for the task notes
    - \`limitResponsePayload\` (optional): Whether to limit response size (defaults to true)
  - Returns: JSON with update result
  - Note: Exactly one of \`html\` or \`markdown\` must be provided (mutually exclusive)

- **update-task-due-date**: Update the due date for a task
  - Parameters:
    - \`taskId\` (required): The ID of the task to update due date for
    - \`dueDate\` (required): Due date in ISO format (YYYY-MM-DDTHH:mm:ssZ) or null to clear the due date
    - \`limitResponsePayload\` (optional): Whether to limit response size
  - Returns: JSON with update result

- **update-task-text**: Update the text/title of a task
  - Parameters:
    - \`taskId\` (required): The ID of the task to update
    - \`text\` (required): The new text/title for the task
    - \`recommendedStreamId\` (optional): Recommended stream ID
    - \`limitResponsePayload\` (optional): Whether to limit response size
  - Returns: JSON with update result

- **update-task-stream**: Update the stream/channel assignment for a task
  - Parameters:
    - \`taskId\` (required): The ID of the task to update stream assignment for
    - \`streamId\` (required): Stream ID to assign to the task
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
      `.trim(),
      }],
    };
  },
};
