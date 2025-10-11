# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
bun run dev                 # Run server with .env file
bun run typecheck          # TypeScript type checking
bun run typecheck:watch    # Watch mode type checking
bun run inspect            # MCP Inspector for debugging

# Build and Distribution
bun run build              # Compile TypeScript to dist/
bun test                   # Run test suite

# Version Management (Changeset)
bun run changeset          # Create new changeset
bun run version            # Apply changesets and update version
bun run release            # Build and publish to npm
```

## Architecture Overview

### Dual Transport MCP Server
This server supports two transport modes with different authentication strategies:

**Stdio Transport** (default):
- Single global SunsamaClient authenticated at startup
- Uses `SUNSAMA_EMAIL`/`SUNSAMA_PASSWORD` environment variables
- Session maintained for entire server lifetime

**HTTP Stream Transport**:
- Per-request authentication via HTTP Basic Auth
- Session-isolated SunsamaClient instances
- Credentials provided in Authorization header

Transport selection via `TRANSPORT_MODE` environment variable ("stdio" | "http").

### Client Resolution Pattern
`utils/client-resolver.ts` abstracts transport differences:
- **Stdio**: Returns singleton client from global authentication
- **HTTP**: Extracts client from session data (authenticated per request)
- Throws standardized errors for unauthenticated requests

### Response Optimization Strategy
Two-tier optimization for large datasets:

1. **Task Filtering** (`utils/task-filters.ts`): Filter by completion status before processing
2. **Task Trimming** (`utils/task-trimmer.ts`): Remove non-essential fields to reduce payload by 60-80%

Always apply filtering before trimming for efficiency.

### Enhanced Pagination Pattern
The `get-archived-tasks` tool implements smart pagination:

- **Limit+1 Pattern**: Fetches `requestedLimit + 1` to determine if more results exist
- **Pagination Metadata**: Returns `hasMore` flag, `nextOffset`, and count information
- **LLM Context**: Provides clear guidance for AI assistants on whether to continue fetching
- **Response Format**: TSV data with pagination header for optimal processing

### Schema Architecture
All tools use Zod schemas from `schemas.ts`:
- Type-safe parameter validation
- Automatic TypeScript inference
- Comprehensive parameter documentation
- Union types for completion filters
- XOR schema patterns for mutually exclusive parameters using `.refine()` for MCP Inspector compatibility
- Example: `update-task-notes` requires either `html` OR `markdown`, but not both

## Key Patterns

### Tool Structure
Modern tool pattern using shared utilities and parameter destructuring:
```typescript
// Old pattern (before refactoring)
server.addTool({
  name: "tool-name",
  description: "...",
  parameters: toolSchema,
  execute: async (args, {session, log}) => {
    const { param1, param2 } = args;
    // Manual error handling, client resolution, etc.
  }
});

// New pattern (current)
export const toolName = createToolWrapper({
  name: "tool-name", 
  description: "...",
  parameters: toolSchema,
  execute: async ({ param1, param2 }: ToolInput, context: ToolContext) => {
    // 1. Parameters automatically destructured and typed
    // 2. Get client via getClient(context.session)
    // 3. Call sunsama-api methods
    // 4. Apply filtering/trimming if needed
    // 5. Return formatted response using formatters
    // Error handling and logging handled by wrapper
  }
});
```

### Authentication Flow
- **Stdio**: `initializeStdioAuth()` creates global client at startup
- **HTTP**: `httpStreamAuthenticator()` authenticates each request
- Both store client in session data accessible via `getSunsamaClient()`

### Configuration Management
`config/transport.ts` handles environment-based configuration:
- Zod validation for environment variables
- Sensible defaults (stdio transport, port 3000)
- Clear error messages for invalid configurations

### Output Formatting
- **JSON**: Single objects (user data)
- **TSV**: Arrays (tasks, streams) - optimized for Claude's data processing
- **Structured Logging**: Consistent patterns across all tools

## Code Organization

### Refactored Modular Architecture (2024)

The codebase has been refactored into a modular, resource-based architecture:

```
src/
├── tools/
│   ├── shared.ts          # Common utilities and tool wrapper patterns
│   ├── user-tools.ts      # User operations (get-user)
│   ├── task-tools.ts      # Task operations (14 tools)
│   ├── stream-tools.ts    # Stream operations (get-streams)
│   └── index.ts           # Export all tools
├── resources/
│   └── index.ts           # API documentation resource
├── auth/                  # Authentication strategies per transport type
├── config/                # Environment configuration and validation
├── utils/                 # Reusable utilities (client resolution, filtering, formatting)
├── schemas.ts             # Zod validation schemas for all tools
├── schemas.test.ts        # Comprehensive test suite for all Zod schemas
└── main.ts                # Streamlined server setup (47 lines vs 1162 before)
```

### Tool Architecture Improvements

**Shared Utilities** (`tools/shared.ts`):
- `createToolWrapper()`: Standardized error handling and logging wrapper
- `getClient()`: Session-aware client resolution
- `formatJsonResponse()`, `formatTsvResponse()`: Consistent response formatting
- `formatPaginatedTsvResponse()`: Specialized pagination support

**Resource-Based Organization**:
- **User Tools**: Single tool for user operations
- **Task Tools**: 14 tools organized by function (query, lifecycle, update)
- **Stream Tools**: Single tool for stream operations

**Type Safety Improvements**:
- **Parameter Destructuring**: Function signatures directly destructure typed parameters
- **Zod Schema Integration**: Full TypeScript inference from Zod schemas
- **Eliminated `any` Types**: All parameters properly typed with generated types

## Important Notes

### Version Synchronization
Always keep FastMCP server version in `src/main.ts` (line 19) synchronized with `package.json` version.

### Environment Variables
Required for stdio transport:
- `SUNSAMA_EMAIL`: Sunsama account email
- `SUNSAMA_PASSWORD`: Sunsama account password

Optional:
- `TRANSPORT_MODE`: "stdio" (default) | "http"
- `PORT`: Server port (default: 3002, HTTP transport only)

### Task Operations
Full CRUD support:
- **Read**: `get-tasks-by-day`, `get-tasks-backlog`, `get-archived-tasks`, `get-task-by-id`, `get-streams`
- **Write**: `create-task`, `update-task-complete`, `update-task-planned-time`, `update-task-notes`, `update-task-snooze-date`, `update-task-backlog`, `update-task-stream`, `delete-task`

Task read operations support response trimming. `get-tasks-by-day` includes completion filtering. `get-archived-tasks` includes enhanced pagination with hasMore flag for LLM decision-making.

### Testing Tools
Use MCP Inspector for debugging: `bun run inspect`
Configure different server variants in `mcp-inspector.json` for testing various scenarios.

## Version Management

**IMPORTANT**: Keep the FastMCP server version in sync with package.json version.

When updating the version:
1. Update `package.json` version (done automatically by changesets)
2. Manually update the FastMCP server version in `src/main.ts` (line 19)
3. Both versions must be identical for consistency

## Git Rules

**IMPORTANT**: Never commit the `dev/` directory or any of its files to git. This directory contains development data including sample API responses and testing data that should remain local only.

**Branch Naming Convention**: Use the format `{type}/{short-name}` where `{type}` follows conventional commit naming convention (feat, fix, chore, refactor, docs, style, test, ci, etc.).