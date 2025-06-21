---
"mcp-sunsama": minor
---

feat: add update-task-planned-time tool for updating task time estimates

This adds a new MCP tool that allows users to update the planned time (time estimate) for existing tasks in Sunsama. The tool accepts a task ID and time estimate in minutes, with optional response payload limiting.

Features:
- Update task time estimates in minutes (converted to seconds for API)
- Support for clearing time estimates by setting to 0
- Comprehensive input validation and error handling
- Full test coverage including edge cases
- Documentation updates for README and CLAUDE.md

The implementation follows established patterns in the codebase and leverages the existing sunsama-api updateTaskPlannedTime method.
