---
title: 'Logit Examples — Module Logger Pattern'
description: 'Module Logger Pattern examples for logit.'
---

## Module Logger Pattern

### Problem

Log entries from different modules are mixed in the output, making it hard to filter by origin. Each module should create its own logger with a fixed namespace so entries can be filtered without additional context.

### Solution

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


### Pitfalls

- Using the same namespace string in two different modules makes their log entries indistinguishable. Use hierarchical namespaces (e.g., `app:orders:service`) to ensure uniqueness.
- Creating the logger at module load time means its namespace and bindings are fixed for that module instance. Prefer request-scoped child loggers when fields vary per request.
- Structured context is first-argument only: use `logger.info({ userId }, 'event')`. String-first calls accept only the message.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Production Setup](./production-setup.md)
- [React Integration](./react-integration.md)
