---
title: 'I18nit Examples — Async Loading and Preload'
description: 'Register lazy locale loaders, best-effort preload catalogs, and switch locales strictly with i18nit.'
---

## Async Loading and Preload

This is the main lazy-loading pattern for route-based or on-demand locale bundles.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: { en: { greeting: 'Hello!' } },
});

i18n.setLoader('ja', () => import('./locales/ja.json').then((m) => m.default));

await i18n.preload('ja'); // best-effort preload
await i18n.setLocale('ja'); // strict switch

i18n.setCatalog('ja', { greeting: 'こんにちは' }); // replace catalog
```

## Notes

- `preload()` does not reject when a loader is missing or fails.
- `setLocale()` does reject if the target locale still cannot be resolved.
- `setLoader()` can be called at any time before switching.

## Related Recipes

- [Diagnostics Hook](./diagnostics-hook.md)
- [Framework Integration](./framework-integration.md)
- [Locale Switcher](./locale-switcher.md)
