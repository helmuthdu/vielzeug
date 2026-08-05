---
title: Conduit Examples — Named Scopes
description: Own request or job resources with named Conduit scopes.
---

## Named Scopes

### Problem

Create one resource per request lifecycle.

### Solution

```ts
const Request = scope('request');
const Session = token<{ id: string }>('Session');

root.factory(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request });

const request = root.createScope(Request);
const session = await request.resolve(Session);
await request.dispose();
```

### Pitfalls

Resolving `Session` from root throws because no matching request scope owns it. A singleton cannot depend on `Session`; use matching scoped lifetime for that factory.

### Related

- [Usage Guide](../usage.md#create-named-scopes)
