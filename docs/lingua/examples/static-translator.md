---
title: 'Lingua Examples — Static Translator'
description: Translate a fixed set of locale catalogs without a resource store.
---

## Static Translator

### Problem

You need localized component or module strings from one catalog, and locale selection stays fixed for translator lifetime. Use `createCatalogTranslator()` instead of managing a locale-keyed catalog map or resource store.

### Solution

Create one translator from one explicit catalog and call `translate()`.

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const translator = createCatalogTranslator(
  { save: 'Enregistrer', status: { plural: { one: 'Une modification', other: '{count} modifications' } } },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
console.log(translator.translate('status', { count: 2 }));
```

### Pitfalls

- Pass one catalog; `createCatalogTranslator()` does not accept locale-keyed catalog maps.
- Create a new translator when locale selection changes.
- Mark plural messages with `plural`; nested objects only group keys.
- Keep arrays and application metadata outside catalogs.

### Related

- [Load feature resources](./feature-resources.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua API Reference](../api.md)
