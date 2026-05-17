---
title: Wireit Example - Batch Resolution
description: Resolve several tokens in parallel.
---

# Batch Resolution

```ts
const Logger = createToken<{ log(message: string): void }>('Logger');
const Config = createToken<{ baseUrl: string }>('Config');

const [logger, config] = await Promise.all([container.resolve(Logger), container.resolve(Config)]);
```

Use `Promise.all()` for unrelated tokens. Use `resolveMany()` only when one token has multiple providers.
