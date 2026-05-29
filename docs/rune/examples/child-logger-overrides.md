---
title: 'Rune Examples — Child Logger Overrides'
description: 'Child Logger Overrides examples for rune.'
---

## Child Logger Overrides

### Problem

A sub-module needs its own log level or namespace without losing the parent's configuration. Creating a child logger via `child()` or `withBindings()` scopes the override without affecting other callers.

### Solution

```ts
import { createLogger } from '@vielzeug/rune';

const base = createLogger({ logLevel: 'info', namespace: 'app' });

// config override — change level for one path
const verbose = base.child({ logLevel: 'debug' });
base.info('base flow');
verbose.debug('debug details for one path');

// context binding — pin fields to every call
const reqLog = base.withBindings({ requestId: 'abc-123', userId: 42 });
reqLog.info('processing'); // emits requestId + userId on every line
reqLog.warn({ slow: true }, 'query took 2s');
```

### Pitfalls

- `withBindings()` returns a new logger instance — it does not mutate the parent. Subsequent calls on the parent use the original bindings.
- Overriding the log level on a child via `child({ logLevel })` does not affect the parent. Remote forwarding still uses the child logger's own resolved remote threshold.
- Passing a mutable object as a binding captures a reference. Subsequent mutations to that object appear in all future log entries from the child logger.

### Related

- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
- [React Integration](./react-integration.md)
