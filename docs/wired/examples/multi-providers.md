---
title: Wired Example - Multi Providers
description: Register multiple implementations for one token.
---

# Multi Providers

```ts
const Plugin = createToken<{ name: string }>('Plugin');

container.value(Plugin, { name: 'first' }, { multi: true });
container.value(Plugin, { name: 'second' }, { multi: true });

const plugins = await container.resolveMany(Plugin);
```

Use `resolveMany()` when a token intentionally has more than one provider.
