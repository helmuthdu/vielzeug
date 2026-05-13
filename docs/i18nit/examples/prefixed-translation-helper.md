---
title: 'I18nit Examples — Prefixed Translation Helper'
description: 'Build local prefix helpers on top of i18n without expanding runtime surface.'
---

## Prefixed Translation Helper

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      auth: {
        login: 'Log in',
        logout: 'Log out',
        welcome: 'Hello, {name}',
      },
    },
  },
});

const auth = (key: string, vars?: Record<string, unknown>) => i18n.t(`auth.${key}`, vars ? { vars } : undefined);

auth('login');
auth('logout');
auth('welcome', { name: 'Alice' });
```
