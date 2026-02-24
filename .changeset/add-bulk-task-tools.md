---
"mcp-sunsama": minor
---

Add bulk task operation tools: update-task-complete-bulk, update-task-uncomplete-bulk, delete-task-bulk, update-task-snooze-date-bulk, and update-task-backlog-bulk. These tools accept an array of task IDs and perform operations sequentially, with individual failures tracked without blocking others.
