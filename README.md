# MCP Sunsama Server

A Model Context Protocol (MCP) server that provides access to Sunsama task management capabilities. Built with FastMCP and TypeScript, running on Bun.

## Features

- **Authentication**: Support for session token and email/password authentication
- **Task Management**: Get tasks by day, access backlog, search tasks
- **User Information**: Access user profile and settings
- **Stream Management**: Get and manage Sunsama streams/channels
- **Type Safety**: Full TypeScript support with Zod validation

## Installation

```bash
# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env

# Edit .env with your credentials
```

## Configuration

### Environment Variables

- `API_KEY`: Your MCP server API key for authentication
- `PORT`: Server port (default: 3002)
- `SUNSAMA_SESSION_TOKEN`: Your Sunsama session token
- `SUNSAMA_EMAIL` & `SUNSAMA_PASSWORD`: Alternative email/password auth

## Usage

### Development
```bash
# Run in development mode
bun run dev

# Type checking
bun run typecheck

# MCP Inspector (for debugging)
bun run inspect
```

### Production
```bash
# Build
bun run build

# Run built version
bun src/main.ts
```

## MCP Tools

### User Operations
- `get-user` - Get current user information including profile, timezone, and group details

### Task Operations (Read)
- `get-tasks-by-day` - Get tasks for a specific day with optional completion filtering
- `get-tasks-backlog` - Get tasks from the backlog
- `get-streams` - Get streams for the user's group (called "channels" in Sunsama UI)

### Task Operations (Write)
- `create-task` - Create a new task with optional properties (notes, streams, time estimate, due date, etc.)
- `update-task-complete` - Mark a task as complete with optional completion timestamp
- `delete-task` - Delete a task permanently

## Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "sunsama": {
      "command": "bun",
      "args": ["--env-file=.env", "./src/main.ts"],
      "env": {
        "PORT": "3002"
      }
    }
  }
}
```

## Architecture

- **FastMCP Framework**: TypeScript MCP server framework
- **Sunsama Client**: Wraps the [sunsama-api](https://github.com/robertn702/sunsama-api) client library
- **Bun Runtime**: Fast JavaScript runtime and package manager
- **Zod Validation**: Type-safe parameter validation