# mcp-sunsama

## 0.15.1

### Patch Changes

- 8924946: Bump sunsama-api to version 0.11.2

## 0.15.0

### Minor Changes

- f2a39f2: Add HTTP transport support with session management and comprehensive test suite

  - Implement HTTP Stream transport alongside existing stdio transport
  - Add dual-layer session caching (client cache + session manager)
  - Implement TTL-based session management with configurable timeouts
  - Add comprehensive unit test suite (251 tests)
  - Add integration test suite for authenticated flows
  - Reorganize tests into standard **tests** directory structure
  - Add TypeScript types for better type safety in tests

## 0.14.1

### Patch Changes

- fix: resolve stdio authentication race condition

  Fixes critical race condition in stdio authentication that caused "Global Sunsama client not initialized" errors and -32800 request cancelled errors in Raycast and other MCP clients. Implements lazy authentication with promise caching to prevent concurrent auth attempts and adds graceful startup error handling.

## 0.14.0

### Minor Changes

- Upgrade FastMCP dependency from 3.3.1 to 3.18.0

  - Updated FastMCP to latest version for improved MCP protocol support and performance
  - Added comprehensive CONTRIBUTING.md documentation with release process
  - Improved README documentation structure
  - All existing functionality remains compatible

## 0.13.0

### Minor Changes

- a39494b: Refactor to modular architecture with improved type safety

  - **BREAKING**: Refactored codebase into modular, resource-based architecture
  - **Major code organization improvements**:

    - Extracted tools into separate files by resource type (user, task, stream)
    - Reduced main.ts complexity by 96% (1162 → 47 lines)
    - Created shared utilities for common patterns
    - Moved API documentation to dedicated resources file

  - **Complete type safety overhaul**:

    - Eliminated all `any` types from function parameters
    - Added proper TypeScript typing with Zod schema inference
    - Implemented parameter destructuring for cleaner function signatures
    - Added missing type exports to schemas

  - **Enhanced developer experience**:

    - Standardized error handling and logging across all tools
    - Consistent response formatting with shared utilities
    - Better code maintainability and testability
    - Clear separation of concerns

  - **New modular structure**:
    ```
    src/tools/
    ├── shared.ts          # Common utilities and patterns
    ├── user-tools.ts      # User operations
    ├── task-tools.ts      # Task operations (14 tools)
    ├── stream-tools.ts    # Stream operations
    └── index.ts           # Export all tools
    ```

  This refactoring maintains 100% API compatibility while significantly improving code quality, type safety, and maintainability.

## 0.12.1

### Patch Changes

- Update update-task-stream tool to use sunsama-api updateTaskStream method

  - Replaced direct GraphQL implementation with sunsama-api updateTaskStream method
  - Changed parameter from `streamIds` array to single `streamId` for API compatibility
  - Updated schema validation and tests to match new single stream parameter
  - Removed `recommendedStreamId` parameter as it's not supported by the API method
  - Improved error handling and logging consistency

## 0.12.0

### Minor Changes

- 763b5b4: feat: add update-task-stream tool for task stream/channel assignment

  Add new `update-task-stream` tool that allows updating the stream/channel assignment for existing Sunsama tasks. This tool provides the ability to:

  - Assign tasks to one or more streams/channels
  - Clear stream assignments by providing an empty array
  - Set a recommended stream ID for the task
  - Control response payload size with limitResponsePayload option

  The tool follows the established patterns for parameter validation, error handling, and response formatting. Includes comprehensive test coverage and updated documentation.

- cde6e75: Add update-task-text tool for updating task titles/text

  Implement new `update-task-text` MCP tool that allows updating the text/title of tasks using the Sunsama API. This tool follows the established patterns for task mutation operations and includes:

  - Zod schema validation with comprehensive parameter documentation
  - Support for optional recommended stream ID and response payload limiting
  - Full test coverage with edge case validation
  - Updated API documentation and README

## 0.11.0

### Minor Changes

- 9d0d694: feat: add update-task-due-date tool for setting and clearing task due dates

  - Adds new `update-task-due-date` tool to set or clear task due dates using ISO datetime format or null
  - Includes comprehensive parameter validation with Zod schema for taskId, dueDate, and limitResponsePayload
  - Supports both setting due dates with ISO datetime strings and clearing due dates with null values
  - Adds extensive test coverage with 11 test cases covering valid inputs, error cases, and edge conditions
  - Updates API documentation and README with complete tool information
  - Follows established patterns for dual transport support (stdio/httpStream) and response optimization

## 0.10.2

### Patch Changes

- Upgrades sunsama package to 0.8.1. Fixes create-task tool snooze date

## 0.10.1

### Patch Changes

- 002cd07: Fix MCP Inspector compatibility for update-task-notes schema

  - Replace ZodIntersection (.and()) with single z.object() using .refine() for XOR validation
  - Ensure schema generates proper JSON Schema with "type": "object" for MCP Inspector
  - Add clear parameter descriptions indicating mutual exclusivity
  - Maintain same validation behavior while fixing compatibility issues
  - Update documentation to reflect schema architecture improvements

## 0.10.0

### Minor Changes

- 52e464c: Refactor update-task-notes schema to use XOR pattern for content parameters

  - Replace nested content object with separate html and markdown parameters
  - Implement XOR validation ensuring exactly one content type is provided
  - Add comprehensive test coverage for the new schema pattern
  - Update tool implementation to handle simplified parameter structure
  - Update documentation across README.md, CLAUDE.md, and API docs

## 0.9.0

### Minor Changes

- 953ecb7: Add update-task-notes tool for updating task notes content

  - New `update-task-notes` tool supports updating task notes with HTML or Markdown content
  - Accepts either `{html: string}` or `{markdown: string}` content format (mutually exclusive)
  - Includes optional `limitResponsePayload` parameter for response optimization
  - Integrates with Sunsama's collaborative editing system for proper synchronization
  - Follows established patterns for tool implementation and error handling
  - Updates API documentation, README, and CLAUDE.md with new tool information

## 0.8.0

### Minor Changes

- 6585510: feat: add update-task-planned-time tool for updating task time estimates

  This adds a new MCP tool that allows users to update the planned time (time estimate) for existing tasks in Sunsama. The tool accepts a task ID and time estimate in minutes, with optional response payload limiting.

  Features:

  - Update task time estimates in minutes (converted to seconds for API)
  - Support for clearing time estimates by setting to 0
  - Comprehensive input validation and error handling
  - Full test coverage including edge cases
  - Documentation updates for README and CLAUDE.md

  The implementation follows established patterns in the codebase and leverages the existing sunsama-api updateTaskPlannedTime method.

## 0.7.0

### Minor Changes

- 3394176: Add get-task-by-id tool for retrieving specific tasks by their unique identifier

  - Add `get-task-by-id` MCP tool that retrieves a specific task by its ID
  - Add `getTaskByIdSchema` with taskId parameter validation
  - Return complete task object if found, null if not found
  - Follow standard tool patterns for authentication, error handling, and logging
  - Update documentation in README.md and CLAUDE.md
  - Maintain consistent JSON response format for single object retrieval

## 0.6.0

### Minor Changes

- 7c90fef: feat: add update-task-backlog tool for moving tasks to backlog

  - Add new update-task-backlog tool that moves tasks to the backlog
  - Update updateTaskSnoozeDateSchema to require newDay parameter
  - Add comprehensive test coverage for the new tool
  - Update documentation in README.md and CLAUDE.md

## 0.5.2

### Patch Changes

- Fix updateTaskSnoozeDate schema validation for null values by using proper union types

## 0.5.1

### Patch Changes

- 005209d: Add prepublishOnly script to ensure build runs before publishing

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
