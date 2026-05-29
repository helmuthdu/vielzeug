---
title: 'Rune Examples — Production Setup'
description: 'Production Setup examples for rune.'
---

## Production Setup

### Problem

In production you need structured JSON output for log aggregation, suppressed debug/info levels to reduce volume, and a set of global fields (service name, version, environment) on every entry.

### Solution

```ts
import { Rune } from '@vielzeug/rune';

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

export const appLog = Rune.child({
  logLevel: isProd ? 'warn' : 'debug',
  timestamp: true,
  variant: 'symbol',
  remote: isProd
    ? {
        logLevel: 'error',
        handler: async (type, data) => {
          // data: { level, message, context, env, namespace?, timestamp? }
          await fetch('/api/logs', {
            body: JSON.stringify(data),
            method: 'POST',
          });
        },
      }
    : undefined,
});
```


### Pitfalls

- JSON transport output is machine-readable but not human-readable. Do not enable it in development — always branch on `process.env.NODE_ENV`.
- Global bindings set with `withBindings()` at startup are fixed for that logger instance. Hot reload or version bumps do not update them — the stale values persist in log entries.
- Setting `logLevel: 'error'` in production suppresses warnings. Warnings often indicate misconfiguration or operational drift worth catching in staging. `logLevel: 'warn'` is a safer default.

### Related
- [Error Handling Patterns (Courier)](@vielzeug/courier/examples/error-handling-patterns)

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [React Integration](./react-integration.md)
