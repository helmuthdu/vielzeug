---
title: 'Logit Examples — Request Middleware'
description: 'Request Middleware examples for logit.'
---

## Request Middleware

## Problem

Implement request middleware in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
import { Logit } from '@vielzeug/logit';

const httpLog = Logit.scope('http');

export function requestLogger(req, res, next) {
  const start = Date.now();
  const label = `${req.method} ${req.path}`;

  res.on('finish', () => {
    const duration = `${Date.now() - start}ms`;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    httpLog[level](`${res.statusCode} ${label}`, { duration, ip: req.ip });
  });

  next();
}
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
- [Production Setup](./production-setup.md)
