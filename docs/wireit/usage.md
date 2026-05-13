---
title: Wireit Usage Guide
description: Practical usage patterns for the Wireit container.
---

# Usage Guide

## Tokens

Create one token per dependency contract.

```ts
const Logger = createToken<{ log(message: string): void }>('Logger');
```

## Registration

Use `value()` for constants and `factory()` for computed values.

```ts
container.value(Logger, console);
container.factory(Service, (logger) => new ServiceImpl(logger), { deps: [Logger] });
```

## Resolution

Call `resolve()` for a single provider and `resolveOptional()` when a missing provider should not throw.

```ts
const service = await container.resolve(Service);
const maybeLogger = await container.resolveOptional(Logger);
```

`resolveMany()` is for multi-provider tokens.

```ts
container.value(Plugin, firstPlugin, { multi: true });
container.value(Plugin, secondPlugin, { multi: true });

const plugins = await container.resolveMany(Plugin);
```

## Lifetimes

- `singleton` caches the first resolved instance.
- `transient` creates a fresh instance every time.
- `scoped` caches once per child container.

Scoped providers must be resolved from a child container.

```ts
container.factory(RequestState, () => ({ id: crypto.randomUUID() }), {
  lifetime: 'scoped',
});
```

## Child Containers

Use `createChild()` when you need a request, job, or test scope.

```ts
const child = container.createChild();
const value = await child.resolve(Service);
```

## Async Providers

Factories may return promises. Concurrent callers share the same in-flight singleton or scoped resolution.

```ts
container.factory(Config, async () => {
  const response = await fetch('/config.json');

  return response.json();
});
```

## Disposal

Dispose the container when its scope ends.

```ts
await container.dispose();
```

Resolved instances with `dispose()` hooks are cleaned up during disposal.
