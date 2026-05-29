---
description: Typed dependency injection for TypeScript.
package: wired
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [rune, relay, permit]
exports: [createContainer, createToken]
---

# /wired

> Typed dependency injection for TypeScript.

[![npm version](https://img.shields.io/npm/v//wired)](https://www.npmjs.com/package//wired) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/wired` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `createToken`

**When to use:** Typed dependency injection for TypeScript.

**Related:** [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/relay](https://vielzeug.dev/relay/) · [@vielzeug/permit](https://vielzeug.dev/permit/)

</details>

`/wired` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /wired
npm install /wired
yarn add /wired
```

## Quick Start

```ts
import { createContainer, createToken } from '/wired';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, {
  log(message) {
    console.log(message);
  },
});

container.factory(Service, (logger) => {
  return {
    async run() {
      logger.log('started');
    },
  };
}, {
  deps: [Logger],
});

await container.resolve(Service);
```

## Documentation

- [Overview](https://vielzeug.dev/wired/)
- [Usage Guide](https://vielzeug.dev/wired/usage)
- [API Reference](https://vielzeug.dev/wired/api)
- [Examples](https://vielzeug.dev/wired/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
