---
title: Wireit Example - Basic Setup
description: Register and resolve the simplest Wireit graph.
---

# Basic Setup

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, {
  log(message) {
    console.log(message);
  },
});

container.factory(Service, (logger) => {
  return {
    async run() {
      logger.log('running');
    },
  };
}, {
  deps: [Logger],
});

await container.resolve(Service);
```

Use `resolveOptional()` when a provider is truly optional.
