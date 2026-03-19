---
title: 'Eventit Examples — Framework Integration'
description: 'React, Vue, and Svelte integration examples for Eventit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Use Eventit from UI frameworks by subscribing on mount and disposing subscriptions on unmount.

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { appBus } from './app-bus';

function UserGreeting() {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    appBus.on(
      'user:login',
      ({ userId }) => {
        fetchUser(userId).then(setUser);
      },
      controller.signal,
    );

    return () => controller.abort();
  }, []);

  return <div>{user?.name ?? 'Not signed in'}</div>;
}
```

```ts [Vue 3]
// src/composables/useAppBus.ts
import { onUnmounted } from 'vue';
import { appBus } from '../events/app-bus';
import type { EventKey, Listener } from '@vielzeug/eventit';
import type { AppEvents } from '../events/app-bus';

export function useAppBus<K extends EventKey<AppEvents>>(event: K, listener: Listener<AppEvents[K]>) {
  const unsub = appBus.on(event, listener);
  onUnmounted(unsub);
}

// In a Vue component
useAppBus('user:login', ({ userId }) => loadProfile(userId));
```

```svelte [Svelte]
// src/stores/theme.ts
import { writable } from 'svelte/store';
import { appBus } from '../events/app-bus';

export const theme = writable<'light' | 'dark'>('light');

const unsub = appBus.on('theme:change', (value) => theme.set(value));

export function destroyThemeStore() {
  unsub();
}
```

```svelte [Svelte Component]
<script>
  import { onDestroy } from 'svelte';
  import { theme, destroyThemeStore } from './stores/theme';

  onDestroy(destroyThemeStore);
</script>

<div class={$theme}>...</div>
```

:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
