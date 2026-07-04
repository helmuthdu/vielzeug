---
title: 'Rune Examples — Request Middleware'
description: 'Request Middleware example for @vielzeug/rune.'
---

## Request Middleware

### Problem

Every log entry produced during an HTTP request should carry the request ID and authenticated user ID — without threading a logger parameter through every function that runs during the request.

### Solution

Use `withBindings({ requestId, ip })` inside the middleware to create a request-scoped logger that pins those fields to every downstream call.

```ts
import { defaultLogger } from '@vielzeug/rune';

const httpLog = defaultLogger.child({ namespace: 'http' });

export function requestLogger(req, res, next) {
  // pin request-scoped fields to every log call in this handler
  const reqLog = httpLog.withBindings({ requestId: req.id, ip: req.ip });
  const start = Date.now();
  const label = `${req.method} ${req.path}`;

  res.on('finish', () => {
    const duration = `${Date.now() - start}ms`;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    reqLog[level]({ status: res.statusCode, duration }, label);
  });

  next();
}
```

### Pitfalls

- `withBindings()` returns a new instance — it does not mutate in place. Assigning it back to a module-level variable replaces the logger for all callers. Use `AsyncLocalStorage` to scope a logger per request.
- The request ID must be generated before the logger is created for the request. Middleware that runs after the logging middleware means early log entries do not carry the request ID.
- Using `console.log` alongside the structured logger bypasses the transport and formatter, producing mixed formats in log aggregators.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
- [Authentication (Courier)](/courier/examples/authentication)
- [Event Bus (Herald)](/herald/)
