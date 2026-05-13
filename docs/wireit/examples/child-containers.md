---
title: Wireit Example - Child Containers
description: Isolated scopes for request or job lifetimes.
---

# Child Containers

```ts
const RequestId = createToken<string>('RequestId');
const RequestService = createToken<{ id: string }>('RequestService');

container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' });
container.factory(RequestService, (id) => ({ id }), { deps: [RequestId], lifetime: 'scoped' });

const requestA = container.createChild();
const requestB = container.createChild();

const a = await requestA.resolve(RequestService);
const b = await requestB.resolve(RequestService);
```

Use child containers whenever a dependency should be isolated from the application root.
