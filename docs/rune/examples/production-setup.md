---
title: 'Rune Examples — Production Setup'
description: 'Production Setup example for @vielzeug/rune.'
---

## Production Setup

### Problem

In production you need structured JSON output for log aggregation, suppressed debug/info levels to reduce volume, and a set of global fields (service name, version, environment) on every entry.

### Solution

Use `child()` with environment-branched transports to route entries to `jsonTransport` and `remoteTransport` in production, and `consoleTransport` in development.

```ts
import { Rune } from '@vielzeug/rune';
import { consoleTransport, jsonTransport, remoteTransport } from '@vielzeug/rune';

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

export const appLog = Rune.child({
  logLevel: isProd ? 'warn' : 'debug',
  transports: isProd
    ? [
        // NDJSON to stdout for log aggregation (ELK, Datadog, CloudWatch)
        jsonTransport({ level: 'warn' }),
        // Forward errors to a remote endpoint
        remoteTransport({
          handler: async (type, data) => {
            await fetch('/api/logs', {
              body: JSON.stringify(data),
              method: 'POST',
            });
          },
          level: 'error',
        }),
      ]
    : [consoleTransport()],
}).withBindings({
  service: 'my-app',
  version: process.env?.APP_VERSION ?? 'dev',
});
```


### Pitfalls

- JSON transport output is machine-readable but not human-readable. Do not enable it in development — always branch on `process.env.NODE_ENV`.
- Global bindings set with `withBindings()` at startup are fixed for that logger instance. Hot reload or version bumps do not update them — the stale values persist in log entries.
- Setting `logLevel: 'error'` in production suppresses warnings. Warnings often indicate misconfiguration or operational drift worth catching in staging. `logLevel: 'warn'` is a safer default.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [React Integration](./react-integration.md)
- [Error Handling (Courier)](/courier/examples/error-handling-patterns)
