---
title: 'Conduit Examples — Child Containers'
description: 'Child containers example for @vielzeug/conduit.'
---

## Child Containers

### Problem

Some dependencies should be isolated to a request, job, or test scope — a fresh instance per invocation — without leaking into the application-wide container or across sibling scopes.

### Solution

Use `container.createScope()` (without a scope token) to create a plain child container that inherits root registrations. Resolve singleton overrides locally on the child. Dispose the child when the scope ends.

```ts
import { createContainer, token } from '@vielzeug/conduit';

interface Logger {
  log(msg: string): void;
}

const Logger = token<Logger>('Logger');
const container = createContainer();

container.value(Logger, console);

// Test isolation: override Logger on a child, root is unaffected
const testChild = container.createScope(undefined, { name: 'test' });
const captured: string[] = [];
testChild.value(Logger, { log: (msg) => captured.push(msg) });

const logger = await testChild.resolve(Logger);
logger.log('captured'); // goes into captured[], not console

await testChild.dispose();
```

#### Per-request children with value overrides

```ts
import { createContainer, token } from '@vielzeug/conduit';

const RequestId = token<string>('RequestId');
const container = createContainer();

async function handleRequest(id: string) {
  const child = container.createScope(undefined, { name: `req-${id}` });
  child.value(RequestId, id);

  const reqId = await child.resolve(RequestId);
  console.log(`handling ${reqId}`);

  await child.dispose();
}

await Promise.all([handleRequest('a'), handleRequest('b')]);
```

### Pitfalls

- A child container's `dispose()` only runs hooks for instances resolved (or registered) within that child. The parent container is unaffected.
- Child containers share singleton instances from the parent — they do not create new copies of parent singletons.
- For lifecycle-scoped factories (one instance per scope), use named scopes with `ScopeToken` instead.

### Related

- [Lifetimes](./lifetimes.md)
- [Named Scopes](./named-scopes.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
