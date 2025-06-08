# MCP Sunsama Server Implementation Plan

## Architecture Overview

The MCP server will follow the FastMCP pattern with:
- **Authentication**: API key or session token validation
- **Tools**: CRUD operations for Sunsama entities (users, tasks, streams)
- **Error Handling**: Proper SunsamaAuthError handling
- **Transport**: HTTP streaming on configurable port

## Implementation Tasks

### Completed ✅
- [x] Analyze SunsamaClient methods and capabilities
- [x] Design MCP server architecture following mcp-closet-manager pattern
- [x] Create src/main.ts following FastMCP architecture (scaffolded)
- [x] Add resources for API documentation and schemas
- [x] Initialize git repository with proper .gitignore
- [x] Set up project structure and dependencies

### High Priority (Next Steps)
- [x] Define authentication strategy for Sunsama credentials (ENV vars)
- [x] Create Zod schemas for API parameters and responses

### Medium Priority
- [ ] Create tool for user operations (getUser)
- [ ] Create tools for task operations (getTasksByDay, getTasksBacklog)
- [ ] Create tool for stream operations (getStreamsByGroupId)
- [ ] Implement proper error handling for SunsamaAuthError

### Low Priority
- [ ] Add comprehensive error handling utilities
- [ ] Add logging and monitoring features

## Core Tools to Implement

### User Tools
- `get-user` - Get current user info
  - Parameters: none
  - Returns: User object with profile, timezone, group info

### Task Tools
- `get-tasks-by-day` - Get tasks for specific day
  - Parameters: day (ISO date string), timezone (optional)
  - Returns: Array of Task objects
- `get-tasks-backlog` - Get backlog tasks
  - Parameters: none
  - Returns: Array of Task objects

### Stream Tools
- `get-streams` - Get streams by group ID
  - Parameters: none (uses cached group ID from user)
  - Returns: Array of Stream objects

## Authentication Strategy

### MCP Server Authentication
- Use API key authentication for MCP server access
- Follow mcp-closet-manager pattern with x-api-key header
- Environment variable: `API_KEY`

### Sunsama API Authentication
- Use environment variables for Sunsama credentials:
  - `SUNSAMA_EMAIL`: User email for Sunsama login
  - `SUNSAMA_PASSWORD`: User password for Sunsama login
- Authentication happens on server startup, not per tool call
- Store authenticated SunsamaClient instance per MCP session
- Handle session persistence across tool calls

## Technical Implementation Details

### Dependencies
- `fastmcp`: MCP server framework
- `sunsama-api`: Local sunsama-ts package
- `zod`: Parameter validation

### Error Handling
- Catch `SunsamaAuthError` from sunsama-ts
- Convert to user-friendly MCP error responses
- Provide clear authentication guidance

### Data Formats
- Follow existing mcp-closet-manager patterns
- Return structured data (avoid TSV for complex objects)
- Include proper type validation

### Current File Structure
```
/
├── .gitignore           # Git ignore patterns
├── README.md           # Project documentation
├── TODO.md             # This implementation plan
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── mcp-inspector.json  # MCP Inspector config
├── bun.lock           # Bun lockfile
└── src/
    └── main.ts         # ✅ Main FastMCP server setup (scaffolded)

    ├── schemas.ts      # ✅ Zod validation schemas

Planned:
├── auth.ts            # Authentication helpers
└── utils/
    └── error-handler.ts  # Error handling utilities
```

## Environment Variables
- `API_KEY`: MCP server authentication key
- `SUNSAMA_EMAIL`: User email for Sunsama login
- `SUNSAMA_PASSWORD`: User password for Sunsama login
- `PORT`: Server port (default: 3000)

## Current Status

### Working Features
- ✅ FastMCP server scaffolded with authentication
- ✅ Session management for SunsamaClient instances
- ✅ API documentation resource
- ✅ Environment configuration
- ✅ Git repository initialized (main branch)

### Next Implementation Phase
1. ✅ Create Zod schemas for all API parameters
2. Add user and task management tools
3. Implement error handling for SunsamaAuthError
4. Test with real Sunsama API credentials

## Testing Strategy
- Use `npx fastmcp dev src/main.ts` for development
- Use `npx fastmcp inspect src/main.ts` for debugging
- Test with MCP Inspector for tool validation
- Requires `API_KEY` environment variable for MCP server access

## Future Enhancements
- Add task creation/update tools
- Stream management operations
- Bulk operations for tasks
- Webhook support for real-time updates