---
title: 'Lingua Examples — SSR Hydration'
description: Transfer resolved locale catalogs from server store to client store.
---

## SSR Hydration

### Problem

You need server-rendered translation output and matching client state without shipping catalog loaders in page data. Use `serialize()` on server and `hydrateTranslationStore()` on client.

### Solution

Create server state from loaded catalogs, then build client store from payload.

```ts
import { createTranslationStore, hydrateTranslationStore } from '@vielzeug/lingua';

const serverI18n = createTranslationStore({
  catalogs: { en: { title: 'Server title' } },
  locale: 'en',
});

try {
  const state = serverI18n.serialize();
  const payload = JSON.stringify(state);
  const clientI18n = hydrateTranslationStore(JSON.parse(payload) as typeof state);

  try {
    console.log(clientI18n.translate('title'));
  } finally {
    clientI18n.dispose();
  }
} finally {
  serverI18n.dispose();
}
```

### Pitfalls

- Serialize after needed lazy catalog resolves.
- Do not expect loader functions in hydrated state; state contains raw catalogs only.
- Pass fallback and missing-message handlers to `hydrateTranslationStore()` when client behavior differs from defaults.

### Related

- [Lazy locale catalog](./feature-resources.md)
- [Static translator](./static-translator.md)
- [SSR State usage](../usage.md#ssr-state)
