---
title: Wireit
description: Async-first typed dependency injection for TypeScript.
---

# Wireit

Wireit is a small, typed IoC container designed for async-first codebases.

## Why Wireit

- Typed symbol tokens via `createToken<T>()`
- Explicit registration via `value`, `factory`, and `bind`
- Single async resolution model via `resolve` and `resolveMany`
- Hierarchical containers for request scoping
- Predictable lifecycle via `init`, `dispose`, and `disposed`

## Quick Example

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const RepoToken = createToken<UserRepo>('UserRepo');
const ServiceToken = createToken<UserService>('UserService');

const container = createContainer();
container.bind(RepoToken, UserRepoImpl);
container.bind(ServiceToken, UserService, { deps: [RepoToken] });

const service = await container.resolve(ServiceToken);
```

## Next Steps

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
