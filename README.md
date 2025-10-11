# Sunsama MCP Server

A Model Context Protocol (MCP) server that provides comprehensive task management capabilities through the Sunsama API. This server enables AI assistants to access Sunsama tasks, create new tasks, mark tasks complete, and manage your productivity workflow.

## Features

### Task Management
- **Create Tasks** - Create new tasks with notes, time estimates, due dates, and stream assignments
- **Read Tasks** - Get tasks by day with completion filtering, access backlog tasks, retrieve archived task history
- **Update Tasks** - Mark tasks as complete with custom timestamps, reschedule tasks or move to backlog
- **Delete Tasks** - Permanently remove tasks from your workspace

### User & Stream Operations
- **User Information** - Access user profile, timezone, and group details
- **Stream Management** - Get streams/channels for project organization
- **Dual Transport** - Support for both stdio and HTTP stream MCP transports

## Installation

### Prerequisites
- [Bun](https://bun.sh) runtime (for development)
- Sunsama account with API access

### Using NPX (Recommended)
No installation required! Use directly with:
```bash
npx mcp-sunsama
```

### Development Setup
1. Clone the repository:
```bash
git clone https://github.com/robertn702/mcp-sunsama.git
cd mcp-sunsama
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment variables:
```bash
cp .env.example .env
# Edit .env and add your Sunsama credentials
```

Environment variables:
- `SUNSAMA_EMAIL` - Your Sunsama account email (required for stdio transport)
- `SUNSAMA_PASSWORD` - Your Sunsama account password (required for stdio transport)
- `TRANSPORT_MODE` - Transport type: `stdio` (default) or `http`
- `PORT` - Server port for HTTP transport (default: 8080)
- `HTTP_ENDPOINT` - MCP endpoint path (default: `/mcp`)
- `SESSION_TTL` - Session timeout in milliseconds (default: 3600000 / 1 hour)
- `CLIENT_IDLE_TIMEOUT` - Client idle timeout in milliseconds (default: 900000 / 15 minutes)
- `MAX_SESSIONS` - Maximum concurrent sessions for HTTP transport (default: 100)

## Usage

### Transport Modes

This server supports two transport modes:

#### Stdio Transport (Default)
For local AI assistants (Claude Desktop, Cursor, etc.):
```bash
bun run dev
# or
TRANSPORT_MODE=stdio bun run src/main.ts
```

#### HTTP Stream Transport
For remote access and web-based integrations:
```bash
TRANSPORT_MODE=http PORT=8080 bun run src/main.ts
```

**HTTP Endpoints:**
- MCP Endpoint: `POST http://localhost:8080/mcp`
- Health Check: `GET http://localhost:8080/`

**Authentication:**
HTTP requests require HTTP Basic Auth with your Sunsama credentials:
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Authorization: Basic $(echo -n 'your-email:your-password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Claude Desktop Configuration

Add this configuration to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "sunsama": {
      "command": "npx",
      "args": ["mcp-sunsama"],
      "env": {
        "SUNSAMA_EMAIL": "your-email@example.com",
        "SUNSAMA_PASSWORD": "your-password"
      }
    }
  }
}
```

## API Tools

### Task Management
- `create-task` - Create new tasks with optional properties
- `get-tasks-by-day` - Get tasks for a specific day with completion filtering
- `get-tasks-backlog` - Get backlog tasks
- `get-archived-tasks` - Get archived tasks with pagination (includes hasMore flag for LLM context)
- `get-task-by-id` - Get a specific task by its ID
- `update-task-complete` - Mark tasks as complete
- `update-task-planned-time` - Update the planned time (time estimate) for tasks
- `update-task-notes` - Update task notes content (requires either `html` or `markdown` parameter, mutually exclusive)
- `update-task-due-date` - Update the due date for tasks (set or clear due dates)
- `update-task-text` - Update the text/title of tasks
- `update-task-stream` - Update the stream/channel assignment for tasks
- `update-task-snooze-date` - Reschedule tasks to different dates
- `update-task-backlog` - Move tasks to the backlog
- `delete-task` - Delete tasks permanently

### User & Stream Operations
- `get-user` - Get current user information
- `get-streams` - Get streams/channels for project organization

## Development

### Running in Development
```bash
bun run dev
```

### Testing with MCP Inspector
```bash
bun run inspect
```

Then connect the MCP Inspector to test the tools interactively.

### Testing
```bash
bun test                   # Run unit tests only
bun test:unit              # Run unit tests only (alias)
bun test:integration       # Run integration tests (requires credentials)
bun test:all               # Run all tests
bun test:watch             # Watch mode for unit tests
```

### Build and Type Checking
```bash
bun run build              # Compile TypeScript to dist/
bun run typecheck          # Run TypeScript type checking
bun run typecheck:watch    # Watch mode type checking
```

### Release Process
For information on creating releases and publishing to npm, see [CONTRIBUTING.md](CONTRIBUTING.md#release-process).

### Code Architecture

The server is organized with a modular, resource-based architecture:

```
src/
├── tools/
│   ├── shared.ts          # Common utilities and patterns
│   ├── user-tools.ts      # User operations (get-user)
│   ├── task-tools.ts      # Task operations (14 tools)
│   ├── stream-tools.ts    # Stream operations (get-streams)
│   └── index.ts           # Export all tools
├── resources/
│   └── index.ts           # API documentation resource
├── auth/                  # Authentication strategies
│   ├── stdio.ts           # Stdio transport authentication
│   ├── http.ts            # HTTP Basic Auth parsing
│   └── types.ts           # Shared auth types
├── transports/
│   ├── stdio.ts           # Stdio transport implementation
│   └── http.ts            # HTTP Stream transport with session management
├── session/
│   └── session-manager.ts # Session lifecycle management
├── config/                # Environment configuration
│   ├── transport.ts       # Transport mode configuration
│   └── session-config.ts  # Session TTL configuration
├── utils/                 # Utilities (filtering, trimming, etc.)
│   ├── client-resolver.ts # Transport-agnostic client resolution
│   ├── task-filters.ts    # Task completion filtering
│   ├── task-trimmer.ts    # Response size optimization
│   └── to-tsv.ts          # TSV formatting utilities
├── schemas.ts             # Zod validation schemas
└── main.ts                # Server setup (47 lines vs 1162 before refactoring)

__tests__/
├── unit/                  # Unit tests (no auth required)
│   ├── auth/              # Auth utility tests
│   ├── config/            # Configuration tests
│   └── session/           # Session management tests
└── integration/           # Integration tests (requires credentials)
    └── http-transport.test.ts
```

**Key Features:**
- **Type Safety**: Full TypeScript typing with Zod schema validation
- **Parameter Destructuring**: Clean, explicit function signatures
- **Shared Utilities**: Common patterns extracted to reduce duplication
- **Error Handling**: Standardized error handling across all tools
- **Response Optimization**: Task filtering and trimming for large datasets
- **Session Management**: Dual-layer caching with TTL-based lifecycle management
- **Test Coverage**: 251+ unit tests and comprehensive integration tests

## Authentication

**Stdio Transport:** Requires `SUNSAMA_EMAIL` and `SUNSAMA_PASSWORD` environment variables.

**HTTP Transport:** Credentials provided via HTTP Basic Auth per request. No environment variables needed for credentials.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Development workflow
- Code style and conventions
- Testing requirements
- Release process (for maintainers)

Quick start:
1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Make your changes
4. Create a changeset: `bun run changeset`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [sunsama-api Library](https://github.com/robertn702/sunsama-api) - The underlying API client
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Issue Tracker](https://github.com/robertn702/mcp-sunsama/issues)