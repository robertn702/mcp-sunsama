# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
bun run dev                 # Run server with .env file
bun run typecheck          # TypeScript type checking
bun run typecheck:watch    # Watch mode type checking
bun run inspect            # MCP Inspector for debugging

# Testing
bun test                   # Run unit tests only
bun test:unit              # Run unit tests only (alias)
bun test:integration       # Run integration tests (requires credentials)
bun test:all               # Run all tests
bun test:watch             # Watch mode for unit tests

# Build and Distribution
bun run build              # Compile TypeScript to dist/
bun run prepublishOnly     # Run build before publish

# Version Management (Changeset)
bun run changeset          # Create new changeset
bun run version            # Apply changesets and update version
bun run release            # Build and publish to npm
```

## Contribution Workflow

**IMPORTANT**: When making changes that affect package users, always create a changeset.

### When to Create a Changeset
- ✅ New user-facing features or tools
- ✅ Bug fixes that affect npm package users
- ✅ API changes or breaking changes
- ✅ Dependency updates that change behavior

### When NOT to Create a Changeset
- ❌ Infrastructure/deployment changes (CI/CD, Docker, Smithery config)
- ❌ Internal refactoring with no behavior changes
- ❌ Documentation updates
- ❌ Development tooling changes

### Standard Workflow
1. Create a branch: `git checkout -b {type}/{short-name}`
2. Make changes and test: `bun test && bun run typecheck`
3. **Create a changeset**: `bun run changeset` (if changes affect users)
4. Commit with conventional format: `git commit -m "fix: description"`
5. Push and create PR

See `CONTRIBUTING.md` for full details.

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

### Session Management Architecture
For HTTP transport, the server implements dual-layer session caching:

**Client Cache Layer** (`utils/client-resolver.ts`):
- In-memory Map caching authenticated SunsamaClient instances
- SHA-256 hashed credential keys for security
- Automatic cache invalidation on authentication failure

**Session Manager Layer** (`session/session-manager.ts`):
- Manages session lifecycle with configurable TTL
- Tracks session metadata (createdAt, lastAccessedAt)
- Automatic cleanup of expired sessions
- Transport reference management for proper cleanup

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
- **Important**: Avoid using `.refine()` on schemas - it transforms `ZodObject` into `ZodEffects` which the MCP SDK cannot parse (results in empty `properties`). Handle complex validation (e.g., XOR between fields) in the tool's `execute` function instead.
- Example: `update-task-notes` requires either `html` OR `markdown`, validated at runtime
- Discriminated unions for task integrations (GitHub, Gmail)

### Integration Support
The `create-task` tool supports external integrations:
- **GitHub Integration**: Link tasks to GitHub issues or pull requests
- **Gmail Integration**: Link tasks to Gmail emails
- Uses discriminated union pattern for type-safe integration handling
- Integration parameter is optional to maintain backward compatibility

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
│   ├── task-tools.ts      # Task operations (15 tools)
│   ├── stream-tools.ts    # Stream operations (get-streams)
│   └── index.ts           # Export all tools
├── resources/
│   └── index.ts           # API documentation resource
├── auth/                  # Authentication strategies per transport type
│   ├── stdio.ts           # Stdio transport authentication
│   ├── http.ts            # HTTP Basic Auth parsing
│   └── types.ts           # Shared auth types
├── transports/
│   ├── stdio.ts           # Stdio transport implementation
│   └── http.ts            # HTTP Stream transport with session management
├── session/
│   └── session-manager.ts # Session lifecycle management
├── config/                # Environment configuration and validation
│   ├── transport.ts       # Transport mode configuration
│   └── session-config.ts  # Session TTL configuration
├── utils/                 # Reusable utilities
│   ├── client-resolver.ts # Transport-agnostic client resolution
│   ├── task-filters.ts    # Task completion filtering
│   ├── task-trimmer.ts    # Response size optimization
│   └── to-tsv.ts          # TSV formatting utilities
├── schemas.ts             # Zod validation schemas for all tools
└── main.ts                # Streamlined server setup (47 lines vs 1162 before)

__tests__/
├── unit/                  # Unit tests (251+ tests, no auth required)
│   ├── auth/              # Auth utility tests
│   ├── config/            # Configuration tests
│   └── session/           # Session management tests
└── integration/           # Integration tests (requires credentials)
    └── http-transport.test.ts
```

### Tool Architecture Improvements

**Shared Utilities** (`tools/shared.ts`):
- `createToolWrapper()`: Standardized error handling and logging wrapper
- `getClient()`: Session-aware client resolution
- `formatJsonResponse()`, `formatTsvResponse()`: Consistent response formatting
- `formatPaginatedTsvResponse()`: Specialized pagination support

**Resource-Based Organization**:
- **User Tools**: Single tool for user operations
- **Task Tools**: 15 tools organized by function (query, lifecycle, update)
- **Stream Tools**: Single tool for stream operations

**Type Safety Improvements**:
- **Parameter Destructuring**: Function signatures directly destructure typed parameters
- **Zod Schema Integration**: Full TypeScript inference from Zod schemas
- **Eliminated `any` Types**: All parameters properly typed with generated types

## Testing Architecture

### Test Organization
Tests are organized in the `__tests__/` directory following standard conventions:

**Unit Tests** (`__tests__/unit/`):
- Run without authentication requirements
- Test individual components in isolation
- Fast execution for TDD workflow
- Run with `bun test` or `bun test:unit`

**Integration Tests** (`__tests__/integration/`):
- Require real Sunsama credentials
- Test full HTTP transport flow
- Validate session management
- Run with `bun test:integration`

### Test Patterns
- Use Bun's built-in test runner with pattern matching
- TypeScript types from MCP SDK for type-safe testing
- Generic helper functions for request/response handling
- Mock transports for unit testing session management

## Important Notes

### Version Synchronization
The MCP server version in `src/constants.ts` is automatically synced from `package.json` when running `bun run version`.

### Environment Variables
Required for stdio transport:
- `SUNSAMA_EMAIL`: Sunsama account email
- `SUNSAMA_PASSWORD`: Sunsama account password

Optional:
- `TRANSPORT_MODE`: "stdio" (default) | "http"
- `PORT`: Server port (default: 3002, HTTP transport only)
- `SESSION_TTL`: Session timeout in milliseconds (default: 3600000 / 1 hour)
- `CLIENT_IDLE_TIMEOUT`: Client idle timeout in milliseconds (default: 900000 / 15 minutes)
- `MAX_SESSIONS`: Maximum concurrent sessions for HTTP transport (default: 100)

### Task Operations
Full CRUD support:
- **Read**: `get-tasks-by-day`, `get-tasks-backlog`, `get-archived-tasks`, `get-task-by-id`, `get-streams`
- **Write**: `create-task` (with GitHub/Gmail integration support), `update-task-complete`, `update-task-planned-time`, `update-task-notes`, `update-task-snooze-date`, `update-task-backlog`, `update-task-stream`, `update-task-text`, `update-task-due-date`, `delete-task`

Task read operations support response trimming. `get-tasks-by-day` includes completion filtering. `get-archived-tasks` includes enhanced pagination with hasMore flag for LLM decision-making.

### Testing Tools
Use MCP Inspector for debugging: `bun run inspect`
Configure different server variants in `mcp-inspector.json` for testing various scenarios.

## Version Management

Version is managed automatically via changesets. When you run `bun run version`:
1. Changesets updates `package.json` version
2. `scripts/sync-version.ts` automatically syncs the version to `src/constants.ts`

No manual version updates needed.

## Git Rules

**IMPORTANT**: Never commit the `dev/` directory or any of its files to git. This directory contains development data including sample API responses and testing data that should remain local only.

**Branch Naming Convention**: Use the format `{type}/{short-name}` where `{type}` follows conventional commit naming convention (feat, fix, chore, refactor, docs, style, test, ci, etc.).