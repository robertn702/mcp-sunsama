---
"mcp-sunsama": patch
---

Fix executable permissions on bin file by adding postbuild script. Adds chmod +x to ensure dist/main.js is executable after build, resolving 'Permission denied' error when running via npx.
