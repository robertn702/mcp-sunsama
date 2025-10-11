---
"mcp-sunsama": patch
---

Fix Node.js v20 compatibility by using sunsama-api subpath exports. Updates all imports to use explicit subpath exports ('sunsama-api/client' and 'sunsama-api/types') instead of root import, resolving ESM/CommonJS interoperability issues.
