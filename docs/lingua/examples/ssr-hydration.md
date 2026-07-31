---
title: 'Lingua Examples — SSR Hydration'
description: Transfer resolved locale catalogs from a server store to a client store.
---

## SSR Hydration

### Problem

You need server-rendered translation output and matching client state without shipping resource loader functions in page data. Use `serialize()` on server and `hydrateI18n()` on client.

### Solution

Create server state from resolved resources, then build a client store from that payload.

```ts
import { createI18n, hydrateI18n } from '@vielzeug/lingua';

const serverI18n = createI18n({
  locale: 'en',
  resources: {
    core: { en: { title: 'Server title' } },
    settings: { en: { heading: 'Settings' } },
  },
});

try {
  await serverI18n.load('settings');
  const state = serverI18n.serialize();
  const payload = JSON.stringify(state);
  const clientI18n = hydrateI18n(JSON.parse(payload) as typeof state);

  try {
    console.log(clientI18n.translate('title'));
    console.log(clientI18n.translate('heading'));
  } finally {
    clientI18n.dispose();
  }
} finally {
  serverI18n.dispose();
}
```

### Pitfalls

- Serialize only after required optional resources resolve.
- Do not expect loader functions in hydrated state; state contains raw catalogs only.
- Pass fallback and missing-message handlers to `hydrateI18n()` when client behavior differs from defaults.

### Related

- [Feature resources](./feature-resources.md)
- [Static translator](./static-translator.md)
- [SSR State usage](../usage.md#ssr-state)
