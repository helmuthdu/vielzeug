---
title: 'Lingua Examples: SSR Hydration'
description: Transfer resolved locale catalogs from server instance to client instance.
---

## SSR Hydration

### Problem

You need server-rendered translation output and matching client state without shipping catalog loaders in page data. Use `serialize()` on the server and pass the payload back as `catalogs` plus `locale` on the client.

### Solution

Create server state from loaded catalogs, then build a client instance from the payload.

```ts
import { createI18n } from '@vielzeug/lingua';

const serverI18n = createI18n({
  catalogs: { en: { title: 'Server title' } },
  locale: 'en',
});

try {
  const state = serverI18n.serialize();
  const payload = JSON.parse(JSON.stringify(state)) as typeof state;
  const clientI18n = createI18n({ catalogs: payload.catalogs, locale: payload.locale });

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

- Serialize after each needed lazy catalog resolves.
- Do not expect loader functions in the payload; `serialize()` returns raw catalogs and the locale only.
- The client restores the serialized locale unless you pass an explicit override.
- Pass fallback and missing-message options when client behavior differs from defaults.

### Related

- [Lazy locale catalog](./feature-resources.md)
- [Static translator](./static-translator.md)
- [SSR State usage](../usage.md#ssr-state)
