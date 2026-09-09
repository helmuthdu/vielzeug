---
title: 'Lingua Examples — SSR Hydration'
description: Transfer resolved locale catalogs from server instance to client instance.
---

## SSR Hydration

### Problem

You need server-rendered translation output and matching client state without shipping catalog loaders in page data. Use `serialize()` on the server and the `state` option on the client.

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
  const payload = JSON.stringify(state);
  const clientI18n = createI18n({ state: JSON.parse(payload) as typeof state });

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
- Do not expect loader functions in hydrated state; state contains raw catalogs only.
- The client restores the serialized locale unless you pass an explicit override.
- Pass fallback and missing-message options when client behavior differs from defaults.

### Related

- [Lazy locale catalog](./feature-resources.md)
- [Static translator](./static-translator.md)
- [SSR State usage](../usage.md#ssr-state)
