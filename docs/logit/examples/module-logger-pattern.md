---
title: 'Logit Examples — Module Logger Pattern'
description: 'Module Logger Pattern examples for logit.'
---

## Module Logger Pattern

## Problem

Implement module logger pattern in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
import { Logit } from '@vielzeug/logit';

export const log = {
  api: Logit.scope('api'),
  auth: Logit.scope('auth'),
  db: Logit.scope('db'),
};

log.api.info('GET /users');
log.auth.warn('token expiring');
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
- [Production Setup](./production-setup.md)
- [React Integration](./react-integration.md)
