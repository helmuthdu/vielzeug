---
title: 'Stateit Examples — Pattern: Batch for Complex Mutations'
description: 'Pattern: Batch for Complex Mutations examples for stateit.'
---

## Pattern: Batch for Complex Mutations

### Problem

A domain operation touches multiple signals at once — for example, updating a loaded flag, a data array, and an error field together. Without batching, watchers and computed values recalculate after every individual write.

### Solution

When a domain operation touches multiple fields at once, wrap in `batch()` so watchers see only the final state:

```ts
import { batch, store } from '@vielzeug/stateit';

type UserSettings = {
  theme: 'light' | 'dark';
  language: 'en' | 'de';
  notifications: boolean;
};

const userStore = store<UserSettings>({
  theme: 'light',
  language: 'en',
  notifications: true,
});

export function applySettings(settings: UserSettings) {
  batch(() => {
    userStore.patch({ theme: settings.theme });
    userStore.patch({ language: settings.language });
    userStore.patch({ notifications: settings.notifications });
  });
  // → one notification for all three changes together
}

applySettings({ theme: 'dark', language: 'de', notifications: false });
```


### Pitfalls

- Throwing inside a `batch()` callback does not roll back mutations made before the throw. All writes applied before the error are committed. Wrap in try/catch and manually revert if atomicity is required.
- Nesting `batch()` inside another `batch()` is safe but the inner batch has no effect — the outer batch controls when watchers are notified.
- `batch()` defers watchers, not computed values. A computed that reads two signals updated in a batch still recalculates once with the final consistent state.

### Related

- [Usage Guide](../usage.md#framework-integration)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
- [Pattern: Shared Module Store](./pattern-shared-module-store.md)
