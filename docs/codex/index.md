---
title: Codex
description: Local MCP access to Vielzeug documentation and package metadata.
package: codex
category: AI
keywords: [mcp, docs, ai]
related: [refine]
exports: [createCodexServer, startHttpHost, CodexError]
environments: [node]
---

<PackageHero package="codex" />

## Why Codex?

Codex exposes current Vielzeug catalog data through MCP without scanning source at request time.

## Installation

```sh
pnpm add @vielzeug/codex
```

## Quick Start

```sh
npx -y @vielzeug/codex
```

## Features

- One generated `data/snapshot.json` carries all docs, checker-resolved type signatures, REPL examples, Refine components, and theme tokens.
- `createCodexServer` registers the package tools, plus Refine component tools whenever the snapshot carries them, and reports the snapshot version in its instructions.
- `startHttpHost` enforces loopback binding plus localhost Host and Origin validation.
- The CLI ships a `vielzeug` agent skill installable into downstream projects.

## Documentation

- [Usage](./usage.md)
- [API](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

## See Also

- [Refine](../refine/) provides component metadata bundled by Codex.
