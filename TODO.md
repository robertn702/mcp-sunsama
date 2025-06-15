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

### Completed (Medium Priority) ✅
- [x] Create tool for user operations (getUser)
- [x] Create get-tasks-backlog tool
- [x] Add papaparse for TSV formatting
- [x] Create reusable authentication utility (ensureAuthenticated)
- [x] Optimize response formats (JSON for single objects, TSV for arrays)

### Completed (Medium Priority) ✅
- [x] Create get-tasks-by-day tool (updated to use getUserTimezone method)

### Medium Priority (In Progress)
- [ ] Create tool for stream operations (getStreamsByGroupId)
- [ ] Implement proper error handling for SunsamaAuthError

### Low Priority
- [ ] Add comprehensive error handling utilities
- [ ] Add logging and monitoring features

## Core Tools Implemented

### User Tools ✅
- `get-user` - Get current user info
  - Parameters: none
  - Returns: User object with profile, timezone, group info (JSON format)

### Task Tools 
- `get-tasks-by-day` - Get tasks for specific day ✅
  - Parameters: day (ISO date string), timezone (optional, defaults to user's timezone)
  - Returns: Array of Task objects (TSV format)
  - Uses getUserTimezone() method for efficient timezone defaulting
- `get-tasks-backlog` - Get backlog tasks ✅
  - Parameters: none
  - Returns: Array of Task objects (TSV format)

### Stream Tools
- `get-streams` - Get streams by group ID (🚧 TODO)
  - Parameters: none (uses cached group ID from user)
  - Returns: Array of Stream objects (TSV format)

## Authentication Strategy

### MCP Server Authentication
- Uses MCP's built-in transport authentication
- No additional API key required

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
- JSON format for single objects (e.g., get-user)
- TSV format for arrays to save context tokens (e.g., get-tasks-backlog)
- Include proper type validation

### Current File Structure
```
/
├── .gitignore           # Git ignore patterns
├── README.md           # Project documentation
├── TODO.md             # This implementation plan
├── package.json        # Dependencies and scripts (includes papaparse)
├── tsconfig.json       # TypeScript configuration
├── mcp-inspector.json  # MCP Inspector config
├── bun.lock           # Bun lockfile
├── .env                # Environment variables (gitignored)
└── src/
    ├── main.ts         # ✅ Main FastMCP server with tools and auth utility
    ├── schemas.ts      # ✅ Zod validation schemas
    └── utils/
        └── to-tsv.ts   # ✅ TSV conversion utility using papaparse
```

## Environment Variables
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
- ✅ `get-user` tool - returns user profile as JSON
- ✅ `get-tasks-backlog` tool - returns backlog tasks as TSV
- ✅ `get-tasks-by-day` tool - returns daily tasks as TSV with timezone support
- ✅ Reusable authentication utility (ensureAuthenticated)
- ✅ TSV formatting for arrays using papaparse
- ✅ Efficient timezone handling using getUserTimezone() method

### Next Implementation Phase
1. Complete remaining tools:
   - `get-streams` - Get streams for user's group
2. Implement proper error handling for SunsamaAuthError
3. Test with real Sunsama API credentials using MCP Inspector
4. Update server instructions to remove outdated authentication references

## Testing Strategy
- Use `npx fastmcp dev src/main.ts` for development
- Use `npx fastmcp inspect src/main.ts` for debugging
- Test with MCP Inspector for tool validation
- Uses MCP's built-in transport for server access

## Future Enhancements
- Add task creation/update tools
- Stream management operations
- Bulk operations for tasks
- Webhook support for real-time updates