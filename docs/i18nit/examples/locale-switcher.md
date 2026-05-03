---
title: 'I18nit Examples — Locale Switcher'
description: 'Implement a locale switcher with preload, strict switching, and subscription-driven rerenders.'
---

## Locale Switcher

This pattern keeps the UI responsive by warming catalogs before switching.

## Example

```ts
const stop = i18n.subscribe(({ locale }) => {
  document.documentElement.lang = locale;
  render();
}, true);

async function changeLocale(locale: string) {
  await i18n.preload(locale);
  await i18n.setLocale(locale);
}

for (const locale of i18n.loadableLocales) {
  console.log(locale);
}

// later
stop();
```

## Notes

- `preload()` is best-effort and never throws.
- `setLocale()` is strict and rejects if the locale cannot be resolved.
- `subscribe(..., true)` gives you one immediate `init` event for the current locale.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Diagnostics Hook](./diagnostics-hook.md)
