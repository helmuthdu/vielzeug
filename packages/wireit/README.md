---
description: Typed dependency injection for TypeScript.
package: wireit
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [logit, eventit, permit]
exports: [createContainer, createToken]
---

# @vielzeug/wireit

> Typed dependency injection for TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/wireit)](https://www.npmjs.com/package/@vielzeug/wireit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/wireit` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `createToken`

**When to use:** Typed dependency injection for TypeScript.

**Related:** [@vielzeug/logit](https://vielzeug.dev/logit/) · [@vielzeug/eventit](https://vielzeug.dev/eventit/) · [@vielzeug/permit](https://vielzeug.dev/permit/)

</details>

`@vielzeug/wireit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/wireit
npm install @vielzeug/wireit
yarn add @vielzeug/wireit
```

## Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

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

- [Overview](https://vielzeug.dev/wireit/)
- [Usage Guide](https://vielzeug.dev/wireit/usage)
- [API Reference](https://vielzeug.dev/wireit/api)
- [Examples](https://vielzeug.dev/wireit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
