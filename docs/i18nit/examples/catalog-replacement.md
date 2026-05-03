---
title: 'I18nit Examples — Catalog Replacement'
description: 'Replace a locale catalog at runtime and react to active-chain updates through subscriptions.'
---

## Catalog Replacement

Use `setCatalog()` when messages come from a CMS, feature flag system, or live configuration source.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    en: {
      dashboard: {
        heading: 'Dashboard',
      },
    },
  },
});

i18n.subscribe(({ reason }) => {
  if (reason === 'catalog-update') renderApp();
});

i18n.setCatalog('en', {
  dashboard: {
    heading: 'Workspace',
    subtitle: 'Everything in one place',
  },
});
```

## Notes

- `setCatalog()` fully replaces the locale catalog.
- If the updated locale is not part of the active fallback chain, subscribers are not notified.
- Use this instead of mutating nested message objects in place.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Framework Integration](./framework-integration.md)
