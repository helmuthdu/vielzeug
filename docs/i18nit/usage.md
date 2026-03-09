---
title: I18nit — Usage Guide
description: Messages, interpolation, pluralisation, async loading, scoping, formatting, and subscriptions for i18nit.
---

## I18nit Usage Guide

::: tip New to i18nit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Import

```ts
import { createI18n } from '@vielzeug/i18nit';
// Optional: import types
import type {
  I18n,
  BoundI18n,
  Messages,
  MessageValue,
  PluralMessages,
  PluralForm,
  Locale,
  Loader,
  Vars,
  Unsubscribe,
  TranslationKey,
  I18nOptions,
} from '@vielzeug/i18nit';
```

## Basic Usage

### Creating an Instance

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { hello: 'Hello!' },
  },
});

i18n.t('hello'); // "Hello!"
```

### Switching Locale

```ts
// Instant switch — no loading
i18n.locale = 'de';

// Async switch — loads the locale via its registered loader first
await i18n.setLocale('de');
```

### Nested Keys

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      nav: { home: 'Home', about: 'About' },
      auth: { login: 'Log in', logout: 'Log out' },
    },
  },
});

i18n.t('nav.home');    // "Home"
i18n.t('auth.login');  // "Log in"
```

### Type-Safe Keys

Provide your messages type to `createI18n<T>()` and `TranslationKey<T>` will enforce valid dot-notation paths at compile time:

```ts
const messages = {
  en: {
    greeting: 'Hello, {name}!',
    nav: { home: 'Home', about: 'About' },
  },
} as const;

type M = typeof messages.en;

const i18n = createI18n<M>({ locale: 'en', messages });

i18n.t('greeting');     // ✅
i18n.t('nav.home');     // ✅
i18n.t('nav.missing');  // ❌ TypeScript error
```

## Variable Interpolation

Pass a `vars` object as the second argument to `t()`. Placeholders in `{curly braces}` are replaced at runtime:

| Syntax | Example | Result |
|---|---|---|
| `{name}` | `t('msg', { name: 'Alice' })` | simple variable |
| `{user.name}` | `t('msg', { user: { name: 'Alice' } })` | nested property |
| `{items[0]}` | `t('msg', { items: ['a', 'b'] })` | array index |
| `{items}` | `t('msg', { items: ['a', 'b', 'c'] })` | comma-joined array |
| `{items\|and}` | `t('msg', { items: ['a', 'b', 'c'] })` | `Intl.ListFormat` conjunction |
| `{items\|or}` | `t('msg', { items: ['a', 'b', 'c'] })` | `Intl.ListFormat` disjunction |
| `{items\| - }` | `t('msg', { items: ['a', 'b', 'c'] })` | custom separator |
| `{items.length}` | `t('msg', { items: ['a', 'b', 'c'] })` | array length |

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome, {name}! You have {count} messages.',
      tagged: 'Tags: {items|and}',
      first: 'First item: {items[0]}',
    },
  },
});

i18n.t('welcome', { name: 'Alice', count: 5 });
// "Welcome, Alice! You have 5 messages."

i18n.t('tagged', { items: ['TypeScript', 'i18n', 'DX'] });
// "Tags: TypeScript, i18n, and DX"

i18n.t('first', { items: ['apple', 'banana'] });
// "First item: apple"
```

Numbers are automatically formatted via `Intl.NumberFormat` when interpolated.

## Pluralisation

A `PluralMessages` object defines forms for each `Intl.PluralRules` category. Only `other` is required.

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      files: {
        zero: 'No files',
        one: 'One file',
        other: '{count} files',
      },
    },
  },
});

i18n.t('files', { count: 0 }); // "No files"
i18n.t('files', { count: 1 }); // "One file"
i18n.t('files', { count: 42 }); // "42 files"
```

The correct form is selected by `Intl.PluralRules` using the `count` variable. The available forms are `zero | one | two | few | many | other` — which forms apply depends on the locale (e.g. Arabic uses all six, English uses `one` and `other`).

## Locale Chain & Fallbacks

When a key is not found in the active locale, i18nit walks a resolution chain:

1. Active locale (`'en-US'`)
2. Language root (`'en'`)
3. Declared fallback(s) (`fallback: 'fr'` or `fallback: ['fr', 'de']`)

```ts
const i18n = createI18n({
  locale: 'en-US',
  fallback: 'en',
  messages: {
    en: { greeting: 'Hello!' },
    'en-US': { farewell: 'Goodbye!' },
  },
});

i18n.t('farewell'); // "Goodbye!" — found in en-US
i18n.t('greeting'); // "Hello!" — falls back to en
```

## Message Management

### `add(locale, messages)` — Deep-Merge

Adds messages to an existing catalog by recursively merging nested objects. Existing keys are preserved.

```ts
i18n.add('en', { nav: { settings: 'Settings' } });
```

### `replace(locale, messages)` — Full Swap

Replaces the entire catalog for a locale with a shallow copy of the given messages.

```ts
i18n.replace('en', await fetch('/api/messages/en').then(r => r.json()));
```

### `has(key, locale?)` and `hasLocale(locale)`

```ts
i18n.has('nav.home');        // check in active locale
i18n.has('nav.home', 'de');  // check in specific locale
i18n.hasLocale('de');        // check if 'de' catalog is loaded
```

### `locales` — All Loaded Locales

```ts
console.log(i18n.locales); // ['en', 'de', 'fr']
```

Useful for rendering a locale switcher UI.

## Async Loading

Register async loaders for locales that should be loaded on demand:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { greeting: 'Hello!' },
  },
  loaders: {
    fr: () => import('./locales/fr.json'),
    de: () => import('./locales/de.json'),
  },
});

// Load and switch atomically — loader runs once, result is cached
await i18n.setLocale('fr');

// Register a loader dynamically after creation
i18n.registerLoader('ja', () => import('./locales/ja.json'));
await i18n.setLocale('ja');

// Pre-load without switching
await i18n.load('de');
```

`setLocale()` guarantees the locale is fully loaded before switching the active locale, preventing a flash of missing translations.

## Scoping

### `scope(ns)` — Key Prefix

Returns a `BoundI18n` with all `t()` calls prefixed by the namespace. The bound translator always uses the active locale.

```ts
const auth = i18n.scope('auth');
auth.t('login');   // equivalent to i18n.t('auth.login')
auth.t('logout');  // equivalent to i18n.t('auth.logout')
```

Scopes can be nested:

```ts
const settingsNotifs = i18n.scope('settings').scope('notifications');
settingsNotifs.t('email'); // i18n.t('settings.notifications.email')
```

### `withLocale(locale)` — Locale Pin

Returns a `BoundI18n` that always translates in the given locale, regardless of the active locale. Useful for server-side rendering where multiple locales may be needed simultaneously.

```ts
const fr = i18n.withLocale('fr');
const de = i18n.withLocale('de');

fr.t('greeting'); // always in French
de.t('greeting'); // always in German
i18n.t('greeting'); // still uses active locale
```

### Composing `scope` and `withLocale`

```ts
const frAuth = i18n.withLocale('fr').scope('auth');
frAuth.t('login'); // i18n.t('auth.login') in French
```

## Formatting Helpers

All formatting helpers use the `Intl` APIs internally and cache formatters for performance.

```ts
// Number
i18n.number(1234567.89);                          // "1,234,567.89"
i18n.number(0.42, { style: 'percent' });           // "42%"

// Currency
i18n.currency(9.99, 'USD');                        // "$9.99"
i18n.currency(9.99, 'EUR', { notation: 'compact' }); // "€9.99"

// Date
i18n.date(new Date(), { dateStyle: 'long' });      // "January 1, 2025"
i18n.date(new Date(), { timeStyle: 'short' });     // "12:00 PM"

// Relative time
i18n.relative(-3, 'day');                          // "3 days ago"
i18n.relative(1, 'hour');                          // "in 1 hour"

// List
i18n.list(['Alice', 'Bob', 'Charlie']);             // "Alice, Bob, and Charlie"
i18n.list(['Alice', 'Bob', 'Charlie'], 'or');       // "Alice, Bob, or Charlie"
```

## Subscriptions

Subscribe to locale changes to trigger re-renders or side effects:

```ts
const unsub = i18n.subscribe((locale) => {
  console.log('Active locale:', locale);
  rerender();
});

// Fire immediately with the current locale
const unsub2 = i18n.subscribe((locale) => init(locale), true);

// Unsubscribe
unsub();
unsub2();

// Remove all subscribers at once
i18n.dispose();
```

## Best Practices

- **Provide a `fallback` locale** in production to ensure graceful degradation when a key is missing.
- **Use `setLocale()` over `i18n.locale =`** when the target locale has a registered loader — it prevents a flash of untranslated content.
- **Use `scope(ns)` in components** to avoid repeating the namespace prefix.
- **Use `withLocale(locale)` on the server** to translate responses for multiple users without changing the global active locale.
- **Register loaders at startup** via `loaders` in `createI18n()` rather than calling `registerLoader()` later, so the loader map is complete before any locale switch.
- **Keep `onMissing` quiet in development** — log the key — and throw (or track) in CI to catch missing translations early.

## Next Steps

|                           |                                                   |
| ------------------------- | ------------------------------------------------- |
| [API Reference](./api.md) | Complete type signatures and method reference     |
| [Examples](./examples.md) | Real-world i18n recipes                           |
