---
title: Wired Example - Async Providers
description: Async factories and concurrent resolution.
---

# Async Providers

```ts
const Config = createToken<{ baseUrl: string }>('Config');

container.factory(Config, async () => {
  const response = await fetch('/config.json');

  return response.json();
});

const [a, b] = await Promise.all([container.resolve(Config), container.resolve(Config)]);
```

Wired shares the same in-flight promise for cached lifetimes, so concurrent callers do not duplicate work.
