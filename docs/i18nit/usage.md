---
title: I18nit — Usage Guide
description: Messages, interpolation, pluralization, loading, scoping, formatting, and subscriptions for i18nit.
---

# I18nit Usage Guide

::: tip New to i18nit?
Start with the [Overview](./index.md), then use this page for implementation-level behavior.
:::

[[toc]]

## Basic Usage

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.t('nav.home');
```

## Variable Interpolation

Interpolation supports nested object paths and array tokens.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      count: '{items.length} items',
      first: 'First: {items[0]}',
      joinAnd: '{items|and}',
      profile: 'User: {user.name}',
      welcome: 'Hello, {name}!',
    },
  },
});

i18n.t('welcome', { name: 'Alice' });
i18n.t('profile', { user: { name: 'Bob' } });
i18n.t('first', { items: ['a', 'b'] });
i18n.t('count', { items: ['a', 'b', 'c'] });
i18n.t('joinAnd', { items: ['A', 'B', 'C'] });
```

## Pluralisation

Plural messages must include `other`; optional forms depend on locale.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      files: { zero: 'No files', one: 'One file', other: '{count} files' },
    },
  },
});

i18n.t('files', { count: 0 });
i18n.t('files', { count: 1 });
i18n.t('files', { count: 5 });
```

If a plural key is used without `count`, runtime defaults to `0` (with a dev warning).

## Async Loading

Register loaders per locale and load on demand.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { greeting: 'Hello!' } },
  loaders: {
    de: () => import('./locales/de.json'),
    fr: () => import('./locales/fr.json'),
  },
});

await i18n.ensureLocale('de'); // preloads, does not switch locale
await i18n.switchLocale('de'); // ensures locale, then switches atomically

i18n.registerLoader('ja', () => import('./locales/ja.json'));
await i18n.switchLocale('ja');

await i18n.reload('de'); // force refresh from loader if registered
```

Notes:

- `ensureLocale()` is a no-op when the locale catalog is already loaded.
- `switchLocale(locale)` is strict by default and rejects when no loader/catalog exists.
- Use `'best-effort'` mode only when you intentionally allow untranslated states.
- `reload(locale)` throws when no loader is registered.

## Scoping

`scope(ns)` prefixes keys; `withLocale(locale)` binds translation locale without changing active locale.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: { login: 'Log in', logout: 'Log out' },
      greeting: 'Hello',
    },
    fr: {
      auth: { login: 'Connexion', logout: 'Déconnexion' },
      greeting: 'Bonjour',
    },
  },
});

const auth = i18n.scope('auth');
auth.t('login');

const fr = i18n.withLocale('fr');
fr.t('greeting');
fr.scope('auth').t('logout');
```

## Formatting Helpers

Formatting helpers are locale-aware and backed by Intl APIs.

```ts
i18n.number(1234.56);
i18n.currency(99.99, 'USD');
i18n.date(new Date(), { dateStyle: 'long' });
i18n.relative(-3, 'day');
i18n.list(['Alice', 'Bob', 'Charlie']);
i18n.list(['Alice', 'Bob'], 'or');
```

## Subscriptions

`subscribe` notifies on locale switches and active-chain catalog updates.

```ts
const stop = i18n.subscribe(({ locale, reason }) => {
  console.log(locale, reason); // reason: 'locale-change' | 'catalog-update'
});

const stopImmediate = i18n.subscribe(({ locale }) => {
  initUI(locale);
}, true);

i18n.batch(() => {
  i18n.add('en', { nav: { about: 'About' } });
  i18n.add('en', { nav: { contact: 'Contact' } });
});

stop();
stopImmediate();
```

## Best Practices

- Type your primary locale and use `createI18n<T>()` for key autocomplete.
- Use `switchLocale()` for user-triggered locale switches.
- Use `batch()` around multiple `add()`/`replace()` operations to avoid extra re-renders.
- Prefer `withLocale()` in SSR or multi-locale rendering pipelines.
- Use `onDiagnostic` to route loader failures and subscriber errors to observability tooling.
