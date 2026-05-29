---
title: 'Lingua Examples — Catalog Replacement'
description: 'Catalog replacement example for @vielzeug/lingua.'
---

## Catalog Replacement

### Problem

You need to swap out a locale's entire catalog at runtime — for example when switching between a default UI copy and a customer-branded copy. The new catalog must replace all existing keys, not just add to them.

### Solution

Call `register(locale, source)` with the new catalog. It replaces the full catalog and notifies all subscribers.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: {
      dashboard: { heading: 'Dashboard' },
    },
  },
});

i18n.subscribe((snapshot) => {
  renderApp(snapshot);
});

// Replace the entire English catalog — all previous keys are discarded
i18n.register('en', {
  dashboard: {
    heading: 'Workspace',
    subtitle: 'Everything in one place',
  },
});
```

### Pitfalls

- `register()` discards all keys from the previous catalog, including any previously applied `merge()` deltas. If you want to add keys without losing existing ones, use `merge()` instead.
- `register()` triggers a subscriber notification synchronously. If your render function is slow, consider debouncing rapid `register()` calls.
- Registering a loader function rather than a static object defers loading until the next `preload()` or `setLocale()` call — it does not immediately fetch or notify.

### Related

- [Route-based Merge](./route-based-merge.md)
- [Async Loading and Reload](./async-loading-and-reload.md)
- [Shared Instance Setup](./shared-instance-setup.md)
