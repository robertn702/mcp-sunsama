---
"mcp-sunsama": minor
---

Refactor to modular architecture with improved type safety

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