---
title: 'Pulse Examples — Outgoing Middleware'
description: 'Outgoing message middleware pipeline example for @vielzeug/pulse.'
---

## Outgoing Middleware

### Problem

You need to intercept every outgoing `send()` call to add cross-cutting behaviour — logging, auth token injection, rate limiting, or message filtering — without scattering that logic across call sites.

### Solution

Pass a `middleware` array to `createPulse()`. Each function receives `(event, payload, next)`. Call `next()` to allow the send; omit it to suppress.

```ts
import { createPulse, type Middleware } from '@vielzeug/pulse';

type ClientEvents = {
  'chat:send': { text: string };
  'action:execute': { type: string; data: unknown };
};

// Logging middleware
const logger: Middleware = (event, payload, next) => {
  console.debug('[ws out]', event, payload);
  next();
};

// Auth token injection middleware
const injectAuth: Middleware = (event, payload, next) => {
  // Note: middleware operates on event/payload metadata, not the raw frame.
  // Use onMessage for incoming auth — this is for outgoing send filtering.
  console.debug('[ws] sending as', getCurrentUser().id);
  next();
};

// Rate-limiting middleware
const rateLimiter = createRateLimiter(10, 1_000); // 10 messages per second

const limit: Middleware = (event, _payload, next) => {
  if (rateLimiter.allow(event)) {
    next();
  }
  // omit next() to drop the message silently
};

const pulse = createPulse<{}, ClientEvents>('wss://api.example.com/ws', {
  middleware: [logger, injectAuth, limit],
  reconnect: true,
});

// All three middleware functions run on every send()
pulse.send('chat:send', { text: 'Hello!' });
// → [ws out] chat:send { text: 'Hello!' }
// → [ws] sending as user-42
// → message sent (if rate limiter allows)
```

#### Suppressing specific events

```ts
const redactSensitive: Middleware = (event, payload, next) => {
  // Drop internal debug events in production
  if (import.meta.env.PROD && event.startsWith('debug:')) return;
  next();
};

const pulse = createPulse<{}, ClientEvents>('wss://api.example.com/ws', {
  middleware: [redactSensitive],
});
```

### Pitfalls

- **Middleware only applies to `send()` calls from application code.** Internal frames (ping, join, subscribe, presence) bypass the middleware pipeline.
- **Order matters.** Middleware runs in array order. A middleware that omits `next()` prevents all subsequent middleware and the actual send from running.
- **Middleware is synchronous.** There is no async support in the pipeline. For async guards, resolve the decision before calling `send()`.

### Related

- [Basic Connection](./basic-connection.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
