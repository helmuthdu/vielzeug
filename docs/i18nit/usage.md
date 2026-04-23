---
title: I18nit — Usage Guide
description: Minimal translation, explicit pluralization, loading, unified formatting, and subscriptions for i18nit.
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

Interpolation supports plain and dot-path placeholders.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      profile: 'User: {user.name}',
      welcome: 'Hello, {name}!',
    },
  },
});

i18n.t('welcome', { name: 'Alice' });
i18n.t('profile', { user: { name: 'Bob' } });
```

## Pluralisation

Plural messages are explicit with `tp(key, count, vars?)`.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      files: { zero: 'No files', one: 'One file', other: '{count} files' },
    },
  },
});

i18n.tp('files', 0);
i18n.tp('files', 1);
i18n.tp('files', 5);
```

Plural keys are resolved as `files.zero|one|two|few|many|other`.

## Async Loading

Register loaders and choose strict switch vs tolerant preload.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { greeting: 'Hello!' } },
  loaders: {
    de: () => import('./locales/de.json'),
    fr: () => import('./locales/fr.json'),
  },
});

await i18n.preload('de'); // tolerant preload (no locale switch)
await i18n.setLocale('de'); // strict switch (throws if missing)

i18n.setLoader('ja', () => import('./locales/ja.json'));
await i18n.setLocale('ja');

i18n.setCatalog('de', { greeting: 'Hallo!' }); // replace catalog
```

Notes:

- `preload(locale)` is tolerant and does not throw for missing loaders.
- `setLocale(locale)` is strict and throws if locale cannot be loaded.
- `setCatalog(locale, messages)` fully replaces the locale catalog.

## Locale and Catalog Metadata

```ts
const i18n = createI18n({
  locale: 'en',
  loaders: {
    de: () => import('./locales/de.json'),
  },
  messages: {
    en: { greeting: 'Hello' },
  },
});

console.log(i18n.locale); // 'en'
console.log(i18n.locales); // ['en']
console.log(i18n.loadableLocales); // ['de']
console.log(i18n.has('greeting')); // true
console.log(i18n.has('missing')); // false
```

## Formatting

Use one entrypoint for all Intl formatting needs.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { greeting: 'Hello' } },
});

i18n.format({ kind: 'number', value: 1234.56 });
i18n.format({ kind: 'currency', currency: 'USD', value: 99.99 });
i18n.format({ kind: 'date', value: new Date(), options: { dateStyle: 'long' } });
i18n.format({ kind: 'relative', value: -3, unit: 'day' });
i18n.format({ kind: 'list', value: ['Alice', 'Bob', 'Charlie'] });
i18n.format({ kind: 'list', value: ['Alice', 'Bob'], options: { type: 'or' } });
```

## Subscriptions

`subscribe` notifies on locale switches and active-chain catalog updates.

```ts
const stop = i18n.subscribe(({ locale, reason }) => {
  console.log(locale, reason); // reason: 'locale-change' | 'catalog-update'
});

const stopImmediate = i18n.subscribe(({ locale }) => initUI(locale), true);

i18n.setCatalog('en', { nav: { about: 'About' } });

stop();
stopImmediate();
```

`subscribe(listener, true)` immediately emits a `locale-change` event for the current locale.

## Diagnostics and Missing Keys

```ts
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: () => fetch('/locales/fr').then((r) => r.json()),
  },
  onDiagnostic: (event) => {
    if (event.kind === 'loader-error') {
      console.warn('loader failed for', event.locale, event.error);
    } else {
      console.error('subscriber failed', event.error);
    }
  },
  onMissing: (key, locale) => `[${locale}] missing: ${key}`,
});

i18n.t('unknown.key');
```

## Lifecycle

```ts
const i18n = createI18n({ locale: 'en' });

i18n.dispose();

// After dispose(), mutating/loading methods throw.
```

## Best Practices

- Keep catalogs string-only and use `tp()` for all plural lookups.
- Use `setLocale()` for user-triggered locale switches.
- Use `preload()` for opportunistic loading during navigation.
- Use `format()` instead of custom locale formatting utilities.
- Use `onDiagnostic` to route loader failures and subscriber errors to observability tooling.
