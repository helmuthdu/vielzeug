---
title: 'I18nit Examples — Per-request Locale Handling'
description: 'Create one i18nit instance per request for SSR, workers, and multi-tenant environments.'
---

## Per-request Locale Handling

Avoid a shared mutable singleton on the server. Build one runtime per request instead.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

export async function createRequestI18n(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale,
    loaders: {
      en: () => import('./locales/en.json').then((m) => m.default),
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  await i18n.setLocale(locale);

  return i18n;
}

const i18n = await createRequestI18n('fr');
i18n.t('greeting', { name: 'Alice' });
```

## Notes

- This avoids locale bleeding between concurrent requests.
- It also keeps request-specific catalogs, diagnostics, and subscriptions isolated.
- Prefer `setLocale()` over `preload()` in server rendering because rendering should fail fast if the requested locale cannot be resolved.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [SSR Rendering](./ssr-rendering.md)
- [Diagnostics Hook](./diagnostics-hook.md)
