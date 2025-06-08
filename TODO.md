# MCP Sunsama Server Implementation Plan

## Architecture Overview

The MCP server will follow the FastMCP pattern with:
- **Authentication**: API key or session token validation
- **Tools**: CRUD operations for Sunsama entities (users, tasks, streams)
- **Error Handling**: Proper SunsamaAuthError handling
- **Transport**: HTTP streaming on configurable port

## Implementation Tasks

### High Priority
- [x] Analyze SunsamaClient methods and capabilities
- [x] Design MCP server architecture following mcp-closet-manager pattern
- [ ] Define authentication strategy for Sunsama credentials
- [ ] Create src/main.ts following FastMCP architecture

### Medium Priority
- [ ] Create Zod schemas for API parameters and responses
- [ ] Create authentication tools (login, logout, isAuthenticated)
- [ ] Create tool for user operations (getUser)
- [ ] Create tools for task operations (getTasksByDay, getTasksBacklog)
- [ ] Create tool for stream operations (getStreamsByGroupId)
- [ ] Implement proper error handling for SunsamaAuthError

### Low Priority
- [ ] Add resources for API documentation and schemas

## Core Tools to Implement

### Authentication Tools
- `login` - Login with email/password
  - Parameters: email (string), password (string)
  - Returns: authentication status
- `is-authenticated` - Check authentication status
  - Parameters: none
  - Returns: boolean authentication status
- `logout` - Clear session
  - Parameters: none
  - Returns: confirmation

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
- Support both authentication methods:
  1. **Session Token**: Direct token provided in tool calls
  2. **Email/Password**: Login flow with credential storage per session
- Store SunsamaClient instance per MCP session
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

### File Structure
```
src/
├── main.ts          # Main FastMCP server setup
├── schemas.ts       # Zod validation schemas
├── auth.ts          # Authentication helpers
└── utils/
    └── error-handler.ts  # Error handling utilities
```

## Environment Variables
- `API_KEY`: MCP server authentication key
- `PORT`: Server port (default: 3000)

## Testing Strategy
- Use `npx fastmcp dev src/main.ts` for development
- Use `npx fastmcp inspect src/main.ts` for debugging
- Test with MCP Inspector for tool validation

## Future Enhancements
- Add task creation/update tools
- Stream management operations
- Bulk operations for tasks
- Webhook support for real-time updates