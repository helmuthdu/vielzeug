---
title: Herald Examples — Bridge Buses Explicitly
description: Forward selected events between typed buses with ordinary subscriptions.
---

## Bridge Buses Explicitly

### Problem

Selected events from one bus must be forwarded to another with visible transformation and lifecycle ownership.

### Solution

Register an ordinary source listener and emit on the target. Its unsubscribe function is the bridge teardown.

```ts
import { createBus } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string };
};

type AuditEvents = {
  'audit:login': { subject: string };
};

const appBus = createBus<AppEvents>();
const auditBus = createBus<AuditEvents>();
const controller = new AbortController();

const bridgeSignal = AbortSignal.any([auditBus.disposalSignal, controller.signal]);
const stopBridge = appBus.on(
  'user:login',
  ({ userId }) => auditBus.emit('audit:login', { subject: userId }),
  { signal: bridgeSignal },
);

appBus.emit('user:login', { userId: '42' });
stopBridge();
appBus.dispose();
auditBus.dispose();
```

For identical event maps, forwarding remains explicit:

```ts
const stop = source.on('user:login', (payload) => target.emit('user:login', payload));
```

### Pitfalls

- Forwarding is synchronous and unbuffered.
- Bind the bridge to the target's `disposalSignal`; combine it with any external owner signal using `AbortSignal.any()`.
- A forwarding listener can create cycles. Keep the event graph directed.
- Transform payloads explicitly when source and target event types differ.

### Related

- [Module-level bus](./module-level-bus.md)
- [Request scoping](./request-scoping.md)
- [Usage Guide](../usage.md#own-subscription-lifetimes)
