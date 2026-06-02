---
title: 'Lingua Examples — Locale Switcher'
description: 'Locale switcher example for @vielzeug/lingua.'
---

## Locale Switcher

### Problem

You need a UI control that lets users switch the active locale at runtime. Switching must update the DOM language attribute and trigger a re-render without a flash of untranslated content.

### Solution

Use `preload()` to warm up the catalog before switching, then `setLocale()` to perform the atomic switch. Subscribe to changes to update the DOM.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello!' },
    de: () => import('./locales/de.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

// Keep the DOM in sync with the active locale
const stop = i18n.subscribe(
  ({ locale }) => {
    document.documentElement.lang = locale;
    render();
  },
  { immediate: true },
);

// Call this from your locale-picker button handler
async function changeLocale(locale: string) {
  await i18n.preload(locale);   // download catalog
  await i18n.setLocale(locale); // switch atomically
}

// Populate the picker with registered locales
for (const locale of i18n.getSupportedLocales()) {
  console.log(locale);
}

// Clean up when the app unmounts
stop();
```

### Pitfalls

- Calling `setLocale()` without `preload()` first still works — `setLocale` loads if needed — but the locale switch happens after the download, which may produce a visible loading gap on slow connections.
- `getSupportedLocales()` returns locales in insertion order. Pass `true` to `getSupportedLocales(true)` for alphabetical order in the picker.
- Storing the selected locale in a URL param (e.g. `?lang=de`) rather than `localStorage` makes the locale shareable and bookmarkable.

### Related

- [Shared Instance Setup](./shared-instance-setup.md)
- [Async Loading and Reload](./async-loading-and-reload.md)
- [Per-request Locale Handling](./per-request-locale-handling.md)
