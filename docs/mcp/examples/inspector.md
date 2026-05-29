---
title: Inspector
description: Inspect the MCP server locally using the MCP Inspector.
---

## Inspect locally with MCP Inspector

Use MCP Inspector to explore the mcp server and test tool calls interactively:

```sh
cd /Users/saatkhel/Projects/vielzeug/packages/mcp
pnpm build
npx @modelcontextprotocol/inspector node dist/cli.js
```

This opens an interactive interface where you can:
- Browse all available tools
- Test tool calls with different arguments
- View request/response data
- Debug integration issues

## HTTP mode for debugging

For debugging or exposing the server over HTTP:

```sh
cd /Users/saatkhel/Projects/vielzeug/packages/mcp
pnpm build
node dist/cli.js --port 3100
```

Then connect to `http://localhost:3100` using your MCP client.

