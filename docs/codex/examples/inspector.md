---
title: 'Codex Examples — Inspector'
description: 'Inspect local Codex MCP server.'
---

## Inspector

### Problem

You need inspect MCP tools and verify local snapshot server.

### Solution

```sh
cd packages/codex
pnpm build
npx @modelcontextprotocol/inspector node dist/cli.js
```

For HTTP debugging:

```sh
node dist/cli.js --port=3100 --debug
curl http://127.0.0.1:3100/health
# {"status":"ok","version":"<snapshot version>"}
```

### Pitfalls

- Inspector needs built `dist/cli.js`.
- HTTP binds loopback only.
- Use stdio for normal MCP client setup.

### Related

- [Usage Guide](../usage.md)
