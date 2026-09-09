---
title: 'Lingua Examples — Static Translator'
description: Translate a fixed set of locale messages without a stateful store.
---

## Static Translator

### Problem

You need localized component or module strings from one catalog, and locale selection stays fixed for the translator's lifetime. Use `createTranslator()` instead of managing a stateful i18n instance.

### Solution

Create one translator from one explicit catalog and call `translate()`.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { save: 'Enregistrer', status: { plural: { one: 'Une modification', other: '{count} modifications' } } },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
console.log(translator.translate('status', { count: 2 }));
```

### Pitfalls

- Pass one catalog; `createTranslator()` does not accept locale-keyed catalog maps.
- Create a new translator when locale selection changes.
- Mark plural messages with `plural`; nested objects only group keys.
- Keep arrays and application metadata outside catalogs.

### Related

- [Lazy locale catalog](./feature-resources.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua API Reference](../api.md)
