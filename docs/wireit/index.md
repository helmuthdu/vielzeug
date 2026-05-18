---
title: Wireit — Typed dependency injection for TypeScript
description: Typed dependency injection for TypeScript.
package: wireit
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [logit, eventit, permit]
exports: [createContainer, createToken]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="wireit" />

<img src="/logo-wireit.svg" alt="Wireit logo" width="156" class="logo-highlight"/>

# Wireit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/wireit` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `createToken`

**When to use:** Type-safe DI container with singleton/transient lifetimes, child scopes, async providers, and circular dependency detection.

**Related:** [Logit](/logit/) · [Eventit](/eventit/) · [Permit](/permit/)

</details>

`@vielzeug/wireit` is a compact dependency injection container built around typed symbol tokens, factory registration, and explicit container scopes.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wireit
```

```sh [npm]
npm install @vielzeug/wireit
```

```sh [yarn]
yarn add @vielzeug/wireit
```

:::

## Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(Service, (logger) => ({ run: async () => logger.log('Running service') }), {
  deps: [Logger],
});

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Why Wireit?

Manual dependency wiring often spreads across modules, making lifetimes and teardown behavior difficult to reason about in larger systems.

| Feature                     | Wireit                                       | tsyringe                | InversifyJS                      |
| --------------------------- | -------------------------------------------- | ----------------------- | -------------------------------- |
| Bundle size                 | <PackageInfo package="wireit" type="size" /> | ~6 kB                   | ~45 kB                           |
| Typed token ergonomics      | ✅                                           | Partial                 | Partial                          |
| Async-first resolution      | ✅                                           | Partial                 | Partial                          |
| Child container scopes      | ✅                                           | ✅                      | ✅                               |
| Explicit disposal lifecycle | ✅                                           | ❌                      | Partial                          |
| Decorator-free usage        | ✅                                           | ❌ (decorator-oriented) | ⚠️ (commonly decorator-oriented) |
| Zero dependencies           | ✅                                           | ✅                      | ❌                               |

**Use Wireit when** you need a compact typed container with explicit scopes and lifecycle control.

**Consider decorator-heavy DI frameworks when** your project is already standardized around metadata/decorator injection patterns.

## Features

- Small core API
- Typed dependency contracts
- Async-first resolution
- Child containers for scope boundaries
- Explicit disposal

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Workit](../workit/index.md) for dependency-managed worker orchestration.
- [Eventit](../eventit/index.md) for pub/sub coordination in container-managed modules.
- [Permit](../permit/index.md) for injecting authorization services.

<!-- markdownlint-enable MD025 MD033 MD060 -->
