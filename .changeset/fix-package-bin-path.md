---
"mcp-sunsama": patch
---

Fix TypeScript build output by excluding __tests__ from compilation. Version 0.15.2 broke because TypeScript was compiling both src/ and __tests__/ directories, causing files to be output to dist/src/ instead of dist/. Now excludes __tests__ so production code builds directly to dist/.
