# @vielzeug/assay

> Framework-agnostic DOM testing primitives — scoped queries, synchronous event dispatchers, and async wait helpers, with zero dependency on any particular UI library.

[![npm version](https://img.shields.io/npm/v/@vielzeug/assay)](https://www.npmjs.com/package/@vielzeug/assay) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/assay` &nbsp;·&nbsp; **Category:** Testing

**Key exports:** `within`, `fireClick`, `fireInput`, `fireKeyDown`, `waitUntil`, `retry`, `waitForEvent`, `AssayError`, `AssayQueryError`, `AssayTimeoutError`

**When to use:** Writing DOM-level tests for any custom-element or vanilla-DOM code — scoped element queries, low-level synchronous event dispatch, and deterministic async waiting — without pulling in a full testing-library dependency or coupling to a specific component framework.

**Related:** [@vielzeug/ore](https://vielzeug.dev/ore/) · [@vielzeug/refine](https://vielzeug.dev/refine/)

</details>

`@vielzeug/assay` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add -D @vielzeug/assay
npm install -D @vielzeug/assay
yarn add -D @vielzeug/assay
```

## Quick Start

```ts
import { fireClick, waitUntil, within } from '@vielzeug/assay';

const panel = document.querySelector('.panel')!;
const view = within(panel);

fireClick(view.get('button.submit'));

await waitUntil(() => view.queryByText('Saved') !== null);
```

## Documentation

- [Overview](https://vielzeug.dev/assay/)
- [Usage Guide](https://vielzeug.dev/assay/usage)
- [API Reference](https://vielzeug.dev/assay/api)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
