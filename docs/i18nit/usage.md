---
title: I18nit — Usage Guide
description: Practical usage patterns for translation, plural branches, locale loading, formatting, and runtime lifecycle in i18nit.
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
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.t('nav.home');
```

Use `createI18n()` to create an isolated runtime instance. That makes browser singletons and per-request server instances equally straightforward.

## Message Shape

`Messages` is a recursive object with string leaves:

```ts
const messages = {
  en: {
    account: {
      title: 'Account',
    },
    notifications: {
      zero: 'No notifications',
      one: 'One notification',
      other: '{count} notifications',
    },
  },
};
```

Use `t('account.title')` for direct string leaves and `tp('notifications', count)` for plural namespaces.

## Variable Interpolation

Interpolation supports plain and dot-path placeholders.

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      profile: 'User: {user.name}',
      welcome: 'Hello, {name}!',
    },
  },
});

i18n.t('welcome', { name: 'Alice' });
i18n.t('profile', { user: { name: 'Bob' } });
```

Missing, `null`, or `undefined` interpolation values render as empty strings.

## Pluralisation

Plural messages are explicit with `tp(key, count, vars?)`.

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
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

`tp()` is intentionally explicit. `t()` never inspects `count` or applies plural rules.

## Ordinal Plurals

Pass `{ ordinal: true }` to `tp()` to use `Intl.PluralRules` with `type: 'ordinal'` (1st, 2nd, 3rd …).

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      position: {
        one: '{count}st place',
        two: '{count}nd place',
        few: '{count}rd place',
        other: '{count}th place',
      },
    },
  },
});

i18n.tp('position', 1, undefined, true); // '1st place'
i18n.tp('position', 2, undefined, true); // '2nd place'
i18n.tp('position', 3, undefined, true); // '3rd place'
i18n.tp('position', 4, undefined, true); // '4th place'
```

## Fallback Resolution

Lookup order is:

1. Active locale
2. Active locale parents, for example `pt-BR -> pt`
3. Configured fallback locales and their parents

```ts
const i18n = createI18n({
  fallback: ['en-GB', 'en'],
  locale: 'pt-BR',
  catalogs: {
    en: { nav: { home: 'Home' } },
    'en-GB': { nav: { home: 'Home' } },
    pt: { nav: { account: 'Conta' } },
  },
});

i18n.t('nav.account');
i18n.t('nav.home');
```

## Async Loading

Register loaders and choose strict switching versus best-effort preload.

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello!' },
    de: () => import('./locales/de.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

await i18n.preload('de'); // best-effort preload (no locale switch)
await i18n.setLocale('de'); // strict switch (throws if missing)

i18n.setLoader('ja', () => import('./locales/ja.json').then((m) => m.default));
await i18n.setLocale('ja');

i18n.setCatalog('de', { greeting: 'Hallo!' }); // replace catalog
```

Notes:

- `preload(locale)` never throws; loader failures are routed to `onDiagnostic`.
- `setLocale(locale)` is strict and throws if locale cannot be loaded.
- `setCatalog(locale, messages)` fully replaces the locale catalog.

## Catalog Management

Use `setCatalog()` for a full replacement or `mergeCatalog()` for incremental updates.

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { nav: { home: 'Home' }, title: 'Dashboard' },
  },
});

// Replace entire catalog
i18n.setCatalog('en', {
  title: 'Workspace',
  subtitle: 'Welcome back',
});

// Deep-merge — nav.home is preserved, nav.about is added
i18n.mergeCatalog('en', { nav: { about: 'About' } });

console.log(i18n.t('nav.home'));  // 'Home'
console.log(i18n.t('nav.about')); // 'About'
```

If the updated locale is part of the active fallback chain, subscribers receive `reason: 'catalog-update'`.

## Locale and Catalog Metadata

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello' },
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});

console.log(i18n.locale); // 'en'
console.log(i18n.loadedLocales); // ['en']
console.log(i18n.loadableLocales); // ['de']
console.log(i18n.has('greeting')); // true
console.log(i18n.has('missing')); // false
```

- `locale` is the active locale.
- `loadedLocales` are locales with catalogs already in memory.
- `loadableLocales` are locales with registered loaders.
- `has(key)` checks the active locale chain, not only the exact locale.

## Formatting

Use one entrypoint for all Intl formatting needs.

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: { en: { greeting: 'Hello' } },
});

i18n.format({ kind: 'number', value: 1234.56 });
i18n.format({ kind: 'currency', currency: 'USD', value: 99.99 });
i18n.format({ kind: 'date', value: new Date(), options: { dateStyle: 'long' } });
i18n.format({ kind: 'relative', value: -3, unit: 'day' });
i18n.format({ kind: 'list', value: ['Alice', 'Bob', 'Charlie'] });
i18n.format({ kind: 'list', value: ['Alice', 'Bob'], options: { type: 'or' } });
i18n.format({ kind: 'duration', value: { hours: 1, minutes: 30 } });
i18n.format({ kind: 'duration', value: { minutes: 5, seconds: 9 }, options: { style: 'short' } });
```

Supported kinds:

- `number`
- `currency`
- `date`
- `relative`
- `list`
- `duration`

### Duration formatting

`duration` uses `Intl.DurationFormat` when available in the runtime (V8 12.3+ / Chrome 117+ / Node 22+). In older environments it falls back to a compact string like `1h 30m`.

```ts
i18n.format({
  kind: 'duration',
  value: { hours: 2, minutes: 0 },
  options: { style: 'long' },
});
// 'Intl.DurationFormat' available: '2 hours'
// fallback: '2h'
```

## Subscriptions

`subscribe` notifies on locale switches and active-chain catalog updates.

```ts
const stop = i18n.subscribe(({ locale, reason }) => {
  console.log(locale, reason); // reason: 'init' | 'locale-change' | 'catalog-update'
});

const stopImmediate = i18n.subscribe(({ locale }) => initUI(locale), true);

i18n.setCatalog('en', { nav: { about: 'About' } });

stop();
stopImmediate();
```

`subscribe(listener, true)` immediately emits an `init` event for the current locale.

Listeners are wrapped so subscriber errors are routed through `onDiagnostic` instead of breaking other listeners.

## Diagnostics and Missing Keys

```ts
const i18n = createI18n({
  locale: 'en',
  catalogs: {
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

Use `isLoaderError()` and `isSubscriberError()` when you want discriminated handling logic in shared infrastructure.

## Lifecycle and Disposal

```ts
const i18n = createI18n({ locale: 'en' });

i18n.dispose();

// After dispose(), mutating/loading methods throw.
```

The runtime also exposes `[Symbol.dispose]()` for environments that support explicit resource management.

## Server-side and Request Scope

For SSR or per-request rendering, create one instance per request instead of sharing mutable locale state globally.

```ts
import { createI18n } from '@vielzeug/i18nit';

export async function renderPage(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale,
    catalogs: {
      en: () => import('./locales/en.json').then((m) => m.default),
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  await i18n.setLocale(locale);

  return `<h1>${i18n.t('title')}</h1>`;
}
```

## Best Practices

- Keep catalogs string-only and use `tp()` for all plural lookups.
- Use `mergeCatalog()` for incremental server-pushed translations; use `setCatalog()` for full replacements.
- Use dot-notation keys (`invite.female`) to access context sub-keys — no extra option needed.
- Use ordinal plurals (`tp(key, n, undefined, true)`) for rank or sequence text.
- Use `setLocale()` for user-triggered locale switches.
- Use `preload()` for opportunistic loading during navigation or route warm-up.
- Use `format()` instead of custom locale formatting utilities.
- Use `onDiagnostic` to route loader failures and subscriber errors to observability tooling.
- Prefer one i18n instance per request in SSR or worker-style environments.
