# mcp-sunsama

## 0.5.0

### Minor Changes

- 8478b69: Add get-archived-tasks tool with enhanced pagination

  - Implement get-archived-tasks tool to access archived task history
  - Add smart pagination with limit+1 pattern to determine if more results exist
  - Include pagination metadata (hasMore flag, nextOffset, count) for LLM context
  - Default limit set to 100 for optimal performance
  - Response format includes TSV data with pagination header
  - Update documentation in README.md and CLAUDE.md

## 0.4.0

### Minor Changes

- 8955a8f: Update the task integration response object and include the url if available
- 8955a8f: Add functional HTTP_ENDPOINT env variable

### Patch Changes

- 8955a8f: Improve transport configuration type safety with discriminated union and template literal validation

## 0.3.0

### Minor Changes

- cdbbdc6: Add update-task-snooze-date tool for comprehensive task scheduling

  - New `update-task-snooze-date` MCP tool enables moving tasks between days, scheduling backlog tasks, and unscheduling tasks to backlog
  - Supports timezone handling and response payload limiting options
  - Uses existing sunsama-api `updateTaskSnoozeDate` method with proper Zod schema validation
  - Addresses three key user stories through single unified tool interface

## 0.2.2

### Patch Changes

- 177cf46: Fix ES module import error in sunsama-api dependency by patching directory imports to include explicit file extensions

## 0.2.1

### Patch Changes

- Fix binary execution issue by adding Node.js shebang line

  The npm package binary was failing to execute because it was missing the `#!/usr/bin/env node` shebang line at the top of the file. This caused the shell to treat the JavaScript file as a shell script instead of passing it to Node.js for execution.

## 0.2.0

### Minor Changes

- Initial release of MCP Sunsama Server

  - Full CRUD task management (create, read, update, delete)
  - Dual transport support (stdio and HTTP stream)
  - User operations and stream management
  - Task filtering by completion status
  - Response optimization with task trimming
  - Comprehensive TypeScript support with Zod validation
  - Authentication support for session tokens and email/password

## 1.0.0

### Major Changes

- Initial release of MCP Sunsama Server

  - Full CRUD task management (create, read, update, delete)
  - Dual transport support (stdio and HTTP stream)
  - User operations and stream management
  - Task filtering by completion status
  - Response optimization with task trimming
  - Comprehensive TypeScript support with Zod validation
  - Authentication support for session tokens and email/password
