---
title: Wireit Example - Dispose Lifecycle
description: Cleanup hooks and container disposal.
---

# Dispose Lifecycle

```ts
const Resource = createToken<{ close(): void }>('Resource');

container.factory(
  Resource,
  () => {
    return {
      close() {
        console.log('closed');
      },
    };
  },
  {
    dispose: (value) => value.close(),
  },
);

await container.resolve(Resource);
await container.dispose();
```

Dispose hooks run when the container is torn down.
