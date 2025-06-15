---
"mcp-sunsama": minor
---

Add update-task-snooze-date tool for comprehensive task scheduling

- New `update-task-snooze-date` MCP tool enables moving tasks between days, scheduling backlog tasks, and unscheduling tasks to backlog
- Supports timezone handling and response payload limiting options  
- Uses existing sunsama-api `updateTaskSnoozeDate` method with proper Zod schema validation
- Addresses three key user stories through single unified tool interface