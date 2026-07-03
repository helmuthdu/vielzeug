---
title: 'Codex Examples — Inspector'
description: 'Inspector example for @vielzeug/codex.'
---

## Inspector

### Problem

You want to explore all available tools interactively, test tool calls with different arguments, and verify the server is wired up correctly before integrating with an AI client.

### Solution

Build the server and run it through the MCP Inspector for an interactive UI. Use HTTP mode during integration testing to inspect raw request and response payloads.

#### Interactive inspection with MCP Inspector

```sh
cd packages/codex
pnpm build
npx @modelcontextprotocol/inspector node dist/cli.js
```

The Inspector opens a browser UI where you can browse tools, call them with custom arguments, and view the raw MCP protocol messages.

#### HTTP mode for integration debugging

```sh
cd packages/codex
pnpm build
node dist/cli.js --port 3100
```

Verify the server is up:

```sh
curl http://localhost:3100/health
# {"status":"ok","version":"1.0.1"}
```

Then connect any MCP client or send raw HTTP requests to `http://localhost:3100/`.

### Pitfalls

- The Inspector requires a built `dist/cli.js`. Run `pnpm build` in `packages/codex` first; inspecting the source directly will fail.
- HTTP mode binds to `0.0.0.0` by default. Do not expose the port publicly in development environments.
- The MCP Inspector version must be compatible with MCP SDK v1.x. Use `npx @modelcontextprotocol/inspector` without a pinned version to get the latest compatible release.

### Related

- [Usage Guide — Transport Modes](../usage.md#transport-modes)
- [API Reference — Runtime Behavior](../api.md#runtime-behavior)
- [Looking Up Components](./looking-up-components.md)
