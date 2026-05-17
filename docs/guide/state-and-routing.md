---
title: State and Routing
description: Compose Stateit and Routeit for reactive, URL-driven application state.
---

# State and Routing

This guide combines `@vielzeug/stateit` and `@vielzeug/routeit` so route changes and app state stay synchronized.
Reactive state means derived values update automatically when source values change.

## Problem

You need to keep URL params, selected views, and reactive state consistent without framework-specific glue code.

## Architecture

| Step           | Package             | Responsibility                                  |
| -------------- | ------------------- | ----------------------------------------------- |
| Reactive store | `@vielzeug/stateit` | Hold current route state and derived UI data    |
| Navigation     | `@vielzeug/routeit` | Match paths and trigger handlers on URL changes |
| Sync layer     | Both                | Keep route params and store values in lockstep  |

## Runnable Example

```ts
import { computed, signal } from '@vielzeug/stateit';
import { createRouter } from '@vielzeug/routeit';

const userId = signal<string | null>(null);
const activeTab = signal<'overview' | 'settings'>('overview');

const pageTitle = computed(() => {
  if (!userId.value) return 'Users';
  return activeTab.value === 'overview' ? `User ${userId.value}` : `User ${userId.value} Settings`;
});

const router = createRouter({
  routes: {
    users: {
      path: '/users',
      handler: () => {
        userId.value = null;
        activeTab.value = 'overview';
        document.title = pageTitle.value;
      },
    },
    userDetail: {
      path: '/users/:id',
      handler: ({ params }) => {
        userId.value = params.id;
        activeTab.value = 'overview';
        document.title = pageTitle.value;
      },
    },
    userSettings: {
      path: '/users/:id/settings',
      handler: ({ params }) => {
        userId.value = params.id;
        activeTab.value = 'settings';
        document.title = pageTitle.value;
      },
    },
  },
});
```

## Expected Output

- Navigating updates reactive signals immediately.
- Derived values (like page title) react to route changes.
- URL state remains the source of truth for view selection.

## Common Pitfalls

- Updating UI state in multiple places instead of one route handler.
- Letting route params drift out of sync with signals — always write signals inside the handler, not in parallel subscriptions.
- Using untyped route params without validation in critical paths.

## See Also

- [Stateit](../stateit/)
- [Routeit](../routeit/)
- [Eventit](../eventit/)
- [Building a Typed Form Flow](./building-a-typed-form-flow)
