---
"mcp-sunsama": minor
---

Add GitHub and Gmail integration support to create-task tool

This minor release adds support for creating Sunsama tasks with GitHub and Gmail integrations, enabling users to convert GitHub issues/PRs and Gmail emails into tasks with proper linking and metadata.

**New Features:**

- Added `TaskGithubIntegration` schema with all required fields (id, repositoryOwnerLogin, repositoryName, number, type, url)
- Added `TaskGmailIntegration` schema with all required fields (id, messageId, accountId, url)
- Updated `create-task` tool to accept optional `integration` parameter
- Implemented discriminated union pattern for type-safe integration handling
- Full TypeScript support with Zod schema validation

**Migration:**
No breaking changes. This is a purely additive feature that extends existing functionality. The integration parameter is optional, so existing code will continue to work without modifications.
