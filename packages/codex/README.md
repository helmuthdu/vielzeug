# @vielzeug/codex

> MCP server exposing all Vielzeug docs to AI clients

## Install and run

```sh
npx -y @vielzeug/codex
npx -y @vielzeug/codex --port=3100
```

Stdio is default. HTTP uses Streamable HTTP on `127.0.0.1`; health endpoint: `http://127.0.0.1:3100/health`.

## Quick Start

```ts
import { SnapshotCatalog, StdioServerTransport, createMcpServer, loadSnapshot } from '@vielzeug/codex';

const snapshot = loadSnapshot();
const catalog = new SnapshotCatalog(snapshot);
await createMcpServer(catalog, { version: snapshot.manifest.version }).connect(new StdioServerTransport());
```

## Documentation

- [Overview](https://vielzeug.dev/codex/)
- [Usage Guide](https://vielzeug.dev/codex/usage)
- [API Reference](https://vielzeug.dev/codex/api)
- [Examples](https://vielzeug.dev/codex/examples)
- [MCP Tools](https://vielzeug.dev/codex/tools)
- [Migration Guide](https://vielzeug.dev/codex/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
