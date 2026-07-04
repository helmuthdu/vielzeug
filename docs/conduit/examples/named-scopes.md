---
title: 'Conduit Examples — Named Scopes'
description: 'Named scopes example for @vielzeug/conduit.'
---

## Named Scopes

### Problem

Some dependencies need a distinct instance per logical scope (e.g., per HTTP request, per WebSocket session) — but `'scoped'` lifetime ties instances to the physical child container object. You want to be explicit about _which kind_ of scope owns a lifetime, not just _any_ child container.

### Solution

Create a `ScopeToken` with `scope()`, register factories with that token as their `lifetime`, then create scope containers with `container.createScope(scopeToken)`. Only containers created with the matching `ScopeToken` will resolve those factories.

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

// Define the scope
const RequestScope = scope('request');

// Tokens that belong to a request scope
const RequestId = token<string>('RequestId');
const RequestLogger = token<{ log(msg: string): void }>('RequestLogger');

const root = createContainer({ name: 'app' });

// Register with the named scope as lifetime
root.factory(RequestId, () => crypto.randomUUID(), { lifetime: RequestScope });
root.factory(RequestLogger, (id) => ({ log: (msg) => console.log(`[${id}] ${msg}`) }), {
  deps: [RequestId],
  lifetime: RequestScope,
});

// Each request gets its own isolated scope container
async function handleRequest(path: string) {
  const requestContainer = root.createScope(RequestScope, { name: `req-${path}` });

  const [id, logger] = await requestContainer.resolveMany([RequestId, RequestLogger] as const);
  logger.log(`handling ${path}`);

  await requestContainer.dispose(); // runs RequestLogger and RequestId dispose hooks
  return id;
}

// Two concurrent requests — each gets independent instances
const [idA, idB] = await Promise.all([handleRequest('/a'), handleRequest('/b')]);
console.log(idA === idB); // false — isolated scope caches
```

#### Multiple named scopes in one container

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

const RequestScope = scope('request');
const UserScope = scope('user');

const RequestId = token<string>('RequestId');
const UserId = token<string>('UserId');
const AuditLog = token<{ write(msg: string): void }>('AuditLog');

const root = createContainer();

root.factory(RequestId, () => crypto.randomUUID(), { lifetime: RequestScope });
root.factory(UserId, () => 'user-42', { lifetime: UserScope });
root.factory(AuditLog, (reqId, userId) => ({ write: (msg) => console.log(`[${reqId}][${userId}] ${msg}`) }), {
  deps: [RequestId, UserId],
  lifetime: RequestScope,
});

// Create nested scope containers
const requestContainer = root.createScope(RequestScope);
const userContainer = requestContainer.createScope(UserScope);

// AuditLog resolves from requestContainer (RequestScope) using RequestId and UserId
// UserId resolves from userContainer (UserScope)
const log = await requestContainer.resolve(AuditLog);
log.write('payment processed');
```

### Pitfalls

- Resolving a named-scope factory from a container that has no matching scope in its ancestor chain throws `ConduitScopedResolutionError`, including the required scope name in the message.
- Named scopes require a **specific** container created via `createScope(scopeToken)`. An ordinary `createScope()` call with no scope token will not satisfy a named-scope factory.
- A single `createScope()` call creates one scope container. To run concurrent isolated scopes (e.g., per-request), call `createScope()` once per scope and dispose each when done.

### Related

- [Child Containers](./child-containers.md)
- [Lifetimes](./lifetimes.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
