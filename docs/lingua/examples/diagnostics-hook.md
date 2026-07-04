---
title: 'Lingua Examples — Diagnostics Hook'
description: 'Diagnostics hook example for @vielzeug/lingua.'
---

## Diagnostics Hook

### Problem

You want to surface missing translation keys and failed locale loads to a monitoring tool or developer console without crashing the UI.

### Solution

Use `onMissingKey` and `onMissingVar` for key/variable misses and try/catch around `preload()` / `setLocale()` for loader errors. There is no global diagnostics bus by design; errors surface at the call site.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { title: 'Home' },
    fr: () => fetch('/api/locales/fr').then((r) => r.json()),
  },
  onMissingKey(key, locale) {
    // Send to your monitoring service
    console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
    return key;
  },
  onMissingVar(varName, key, locale) {
    console.warn(`[i18n] missing var "{${varName}}" in key "${key}" for locale "${locale}"`);
    return `{${varName}}`;
  },
});

try {
  await i18n.preload('fr');
  await i18n.setLocale('fr');
} catch (error) {
  // Network failure or malformed JSON from the loader
  console.error('Could not switch locale', error);
  await i18n.setLocale('en'); // fall back to default
}
```

### Pitfalls

- `onMissingKey` and `onMissingVar` are called synchronously inside `t()` and `tp()`. Keep them fast — avoid network calls or heavy computation.
- `onMissingKey` and `onMissingVar` must return a `string`. Returning `undefined` or throwing will produce a runtime error in the translation pipeline.
- `preload()` rejects if the loader throws. If you do not catch the rejection, the `setLocale()` call that follows will throw `LinguaMissingLocaleError` because the catalog was never stored.

### Related

- [Per-request Locale Handling](./per-request-locale-handling.md)
- [Async Loading and Reload](./async-loading-and-reload.md)
- [Shared Instance Setup](./shared-instance-setup.md)
