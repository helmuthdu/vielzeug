---
title: 'Lingua Examples — Static Translator'
description: Translate a fixed set of locale catalogs without a resource store.
---

## Static Translator

### Problem

You need localized component or module strings, but locale selection and catalogs stay fixed for translator lifetime. Use `createTranslator()` instead of managing a resource store.

### Solution

Create one translator from locale-keyed explicit catalogs and call `translate()`.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  {
    en: { save: 'Save', status: { plural: { one: 'One change', other: '{count} changes' } } },
    fr: { save: 'Enregistrer', status: { plural: { one: 'Une modification', other: '{count} modifications' } } },
  },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
console.log(translator.translate('status', { count: 2 }));
```

### Pitfalls

- Pass locale-keyed catalogs; `createTranslator()` does not infer a locale map from one catalog.
- Create a new translator when locale selection changes.
- Mark plural messages with `plural`; nested objects only group keys.

### Related

- [Load feature resources](./feature-resources.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua API Reference](../api.md)
