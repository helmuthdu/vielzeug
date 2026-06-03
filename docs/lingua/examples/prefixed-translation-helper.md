---
title: 'Lingua Examples — Prefixed Translation Helper'
description: 'Prefixed translation helper example for @vielzeug/lingua.'
---

## Prefixed Translation Helper

### Problem

A component or module owns a namespace of translation keys (e.g. `auth.*`). Writing the full dotted path in every `t()` call is repetitive and fragile — renaming the namespace requires touching every call site.

### Solution

Use `i18n.scope(prefix)` to create a helper that prepends the prefix automatically. Store the result in a module-level variable.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      auth: {
        login: 'Log in',
        logout: 'Log out',
        welcome: 'Hello, {name}',
        attempts: { one: '{count} attempt', other: '{count} attempts' },
      },
    },
  },
});

// scope() returns { fmt, t, tp, has } bound to 'auth'
const auth = i18n.scope('auth');

auth.t('login'); // i18n.t('auth.login')
auth.t('logout'); // i18n.t('auth.logout')
auth.t('welcome', { name: 'Alice' }); // i18n.t('auth.welcome', { name: 'Alice' })
auth.tp('attempts', 3); // i18n.tp('auth.attempts', 3)
auth.has('login'); // i18n.has('auth.login')
```

### Pitfalls

- `scope()` returns a new object on every call — store the result in a variable rather than calling `i18n.scope('auth')` inline on each render.
- The `ScopedI18n` object does not cache — it delegates to the parent `i18n` instance on every call, so locale changes are reflected automatically.
- Keys inside a scope can include additional dots for deeper paths: `auth.t('menu.settings')` resolves to `'auth.menu.settings'`.

### Related

- [Shared Instance Setup](./shared-instance-setup.md)
- [Route-based Merge](./route-based-merge.md)
