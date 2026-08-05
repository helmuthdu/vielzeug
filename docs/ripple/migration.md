---
title: Ripple 2.0 Migration
---

# Ripple 2.0 Migration

Ripple 2.0 redesigns the reactive runtime and public API.

## Create explicit reactive graphs

Use `createRipple()` when a feature needs an isolated graph and lifecycle boundary. Create signals, computed values, effects, stores, resources, scopes, and watchers through that graph.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const doubled = ripple.computed(() => count.value * 2);
```

## Recheck ownership and cleanup

Update reactive integrations to retain and dispose the handles returned by effects and watchers. Dispose feature-level Ripple graphs when their owning lifetime ends.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current signal, scope, store, resource, and watch contracts.
