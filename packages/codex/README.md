# @vielzeug/codex

> MCP server exposing all Vielzeug docs to AI clients

## Install and run

```sh
npx -y @vielzeug/codex
npx -y @vielzeug/codex --port=3100
```

Stdio is default. HTTP uses Streamable HTTP on `127.0.0.1`; health endpoint: `http://127.0.0.1:3100/health`.

Install the bundled `vielzeug` agent skill into a project (autodetects `.agents/skills`, `.github/skills`, or `.claude/skills`):

```sh
npx -y @vielzeug/codex skills install
```

## Quick Start

```ts
import { createCodexServer } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const server = createCodexServer();

await server.connect(new StdioServerTransport());
```

## Documentation

- [Overview](https://vielzeug.dev/codex/)
- [Usage Guide](https://vielzeug.dev/codex/usage)
- [API Reference](https://vielzeug.dev/codex/api)
- [Examples](https://vielzeug.dev/codex/examples)
- [MCP Tools](https://vielzeug.dev/codex/tools)
- [Migration Guide](https://vielzeug.dev/codex/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
