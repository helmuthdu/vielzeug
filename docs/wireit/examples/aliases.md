---
title: 'Wireit Examples — Aliases'
description: 'Aliases examples for wireit.'
---

## Aliases

## Problem

Implement aliases in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Interface to implementation

```ts
const ILoggerToken = createToken<ILogger>('ILogger');
const ConsoleLoggerToken = createToken<ConsoleLogger>('ConsoleLogger');

container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);

// Both resolve to the same ConsoleLogger instance
const logger = container.get(ILoggerToken);
```

### Swapping implementations

```ts
if (process.env.NODE_ENV === 'production') {
  container.bind(LoggerToken, CloudLogger, { deps: [ConfigToken] });
} else {
  container.bind(LoggerToken, ConsoleLogger);
}

container.alias(ILoggerToken, LoggerToken);
```

### Alias chains

```ts
container.value(BaseConfigToken, { timeout: 5000 });
container.alias(AppConfigToken, BaseConfigToken);
container.alias(ServiceConfigToken, AppConfigToken);

// All three resolve to { timeout: 5000 }
container.get(ServiceConfigToken);
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
- [Batch Resolution](./batch-resolution.md)
