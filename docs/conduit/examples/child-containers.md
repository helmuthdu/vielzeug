---
title: 'Conduit Examples: Child Containers'
description: Own request or job resources with Conduit child containers.
---

## Child Containers

### Problem

Create one resource per request lifecycle.

### Solution

```ts
const Session = token<{ id: string }>('Session');

const root = createContainer([]);

const request = root.createScope({
  providers: [factoryProvider(Session, [], () => ({ id: crypto.randomUUID() }))],
});
const services = await request.resolve({ session: Session });
await request.dispose();
```

### Pitfalls

Each child caches its own singleton, so two request children resolve distinct `Session` values. Register request-owned tokens on the child, not the root, so the root never disposes or shares request state. Disposing the root disposes every active child.

### Related

- [Usage Guide](../usage.md#scope-work-to-child-containers)
