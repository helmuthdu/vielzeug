---
title: 'Logit Examples — Production Setup'
description: 'Production Setup examples for logit.'
---

## Production Setup

## Problem

Implement production setup in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
import { Logit } from '@vielzeug/logit';

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

Logit.setConfig({
  environment: true,
  logLevel: isProd ? 'warn' : 'debug',
  timestamp: true,
  variant: 'symbol',
  remote: isProd
    ? {
        logLevel: 'error',
        handler: async (type, data) => {
          await fetch('/api/logs', {
            body: JSON.stringify({ level: type, ...data }),
            method: 'POST',
          });
        },
      }
    : {},
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [React Integration](./react-integration.md)
