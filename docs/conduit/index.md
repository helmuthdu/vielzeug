---
title: Conduit — Dependency Injection for TypeScript
description: Dependency-first asynchronous dependency injection with typed tokens, lifecycle scopes, startup validation, and deterministic disposal.
package: conduit
category: infrastructure
keywords: [dependency injection, container, token, lifecycle, scope]
exports: [createContainer, valueProvider, factoryProvider, disposalSignalToken, token, scope]
related: [courier, vault, rune]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="conduit" />

## Why Conduit?

Conduit makes service wiring explicit. Typed builders create immutable providers, static graphs are validated at construction, and dependency tuples drive creation and disposal. Resolve one root token or a typed composition map.

```ts
// Before
const service = createService(createApi(config), logger);

// After
const container = createContainer([
  valueProvider(Config, config),
  factoryProvider(Api, [Config], (config) => createApi(config)),
  factoryProvider(Service, [Api, Logger], (api, logger) => createService(api, logger)),
]);
const services = await container.resolve({ service: Service });
```

| Feature | Conduit | Inversify | tsyringe |
| --- | --- | --- | --- |
| Dependencies | Explicit token tuples | Decorators/runtime metadata | Decorators/runtime metadata |
| Async factories | <ore-icon name="check" size="16"></ore-icon> | Partial | Partial |
| Lifecycle scopes | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Runtime dependencies | 0 | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Conduit when** application services need explicit wiring and owned lifecycle cleanup.

**Consider direct imports when** dependencies are static, small, and need no replacement or disposal boundary.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/conduit
```

```sh [npm]
npm install @vielzeug/conduit
```

```sh [yarn]
yarn add @vielzeug/conduit
```

:::

## Quick Start

```ts
import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` })),
]);

const services = await container.resolve({ client: Client });
console.log(services.client);
await container.dispose();
```

## Features

<div class="features-grid">

- **`token`**: typed dependency identity
- **`valueProvider` / `factoryProvider`**: token-safe immutable registrations
- **`createContainer`**: validated provider graph
- **`resolve`**: direct service or typed composition map
- **`scope`**: explicit request and job ownership
- **`dispose`**: in-flight-safe resource cleanup

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Courier](/courier/) — inject HTTP clients into application services.
- [Vault](/vault/) — inject persistence adapters with scoped ownership.
- [Rune](/rune/) — provide application logging services.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
