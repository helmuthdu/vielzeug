# @vielzeug/scribe

> Safe Markdown prose: deterministic parser, XSS-safe DOM and HTML renderers, outline and plain-text extraction.

## Installation

```sh
pnpm add @vielzeug/scribe
npm install @vielzeug/scribe
yarn add @vielzeug/scribe
```

## Quick Start

```ts
import { parseProse, renderProseHtml } from '@vielzeug/scribe';

const doc = parseProse('# Hello\n\nRendered **safely**: `<script>` is inert text.');

console.log(renderProseHtml(doc));
// <h1>Hello</h1>
// <p>Rendered <strong>safely</strong>: <code>&lt;script&gt;</code> is inert text.</p>
```

Zero runtime dependencies. The DOM renderer (`renderProseDom`) builds every node with
`createTextNode`/`createElement`, so Markdown can never execute; disallowed link
protocols degrade to plain text at parse time.

## Documentation

- [Overview](https://vielzeug.dev/scribe/)
- [Usage Guide](https://vielzeug.dev/scribe/usage)
- [API Reference](https://vielzeug.dev/scribe/api)
- [Examples](https://vielzeug.dev/scribe/examples)
- [Migration Guide](https://vielzeug.dev/scribe/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
