---
title: 'Wireit Examples — Lifetimes'
description: 'Lifetimes examples for wireit.'
---

## Lifetimes

## Problem

Implement lifetimes in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Singleton (default)

```ts
const CacheToken = createToken<Cache>('Cache');

container.factory(CacheToken, () => new LRUCache({ max: 500 }));

const a = container.get(CacheToken);
const b = container.get(CacheToken);
console.log(a === b); // true — same instance
```

### Transient

```ts
const RequestIdToken = createToken<string>('RequestId');

container.factory(RequestIdToken, () => crypto.randomUUID(), { lifetime: 'transient' });

const id1 = container.get(RequestIdToken);
const id2 = container.get(RequestIdToken);
console.log(id1 === id2); // false — new UUID each time
```

### Scoped

```ts
const RequestContextToken = createToken<RequestContext>('RequestContext');

container.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });

const child1 = container.createChild();
const child2 = container.createChild();

console.log(child1.get(RequestContextToken) === child2.get(RequestContextToken)); // false
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Aliases](./aliases.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
