---
title: 'I18nit Examples — Prefixed Translation Helper'
description: 'Build local prefix helpers on top of i18nit without adding more runtime surface.'
---

## Prefixed Translation Helper

I18nit intentionally does not ship built-in namespacing helpers. A small local function is enough.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: {
        login: 'Log in',
        logout: 'Log out',
        welcome: 'Hello, {name}',
      },
    },
  },
});

const auth = (key: string, vars?: Record<string, unknown>) => i18n.t(`auth.${key}`, vars);

auth('login');
auth('logout');
auth('welcome', { name: 'Alice' });
```

## Notes

- Keep helpers local to the feature or module that owns the namespace.
- This keeps the runtime small and avoids another abstraction layer.

## Related Recipes

- [Shared Instance Setup](./shared-instance-setup.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Diagnostics Hook](./diagnostics-hook.md)
