---
title: I18nit — Usage Guide
description: Messages, interpolation, pluralisation, async loading, batching, scoping, formatting, and subscriptions for i18nit.
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
  TranslationKeyParam,
  LocaleChangeListener,
  DiagnosticEvent,
  NamespaceKeys,
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

1. Active locale (e.g. `'sr-Latn-RS'`)
2. Each BCP47 ancestor tag, truncating one segment at a time (`'sr-Latn'`, then `'sr'`)
3. Declared fallback(s) (`fallback: 'en'` or `fallback: ['fr', 'de']`)

```ts
const i18n = createI18n({
  locale: 'sr-Latn-RS',
  fallback: 'en',
  messages: {
    en:          { greeting: 'Hello!' },
    'sr':        { common: 'Serbian' },
    'sr-Latn':   { script: 'Latin script' },
    'sr-Latn-RS': { regional: 'Serbia regional' },
  },
});

i18n.t('regional'); // "Serbia regional" — exact match
i18n.t('script');   // "Latin script"    — sr-Latn ancestor
i18n.t('common');   // "Serbian"         — sr root
i18n.t('greeting'); // "Hello!"          — declared fallback
```

## Message Management

### `add(locale, messages)` — Deep-Merge

Adds messages to an existing catalog by recursively merging nested objects. Existing keys are preserved.

```ts
i18n.add('en', { nav: { settings: 'Settings' } });
```

### `replace(locale, messages)` — Full Swap

Replaces the entire catalog for a locale with a shallow copy of the given messages. All previous entries for that locale are discarded.

```ts
i18n.replace('en', await fetch('/api/messages/en').then(r => r.json()));
```

### `reload(locale)` — Force-Refresh

Clears the catalog for `locale` and re-invokes its registered loader. Unlike `load()`, which is a no-op when the catalog is already populated, `reload()` always fetches fresh content. Useful for hot-reload scenarios or forcing bundle refreshes after a deployment.

```ts
// Re-fetches the 'en' bundle even though it was already loaded
await i18n.reload('en');
```

### `batch(fn)` — Bulk Update

Executes `fn` while deferring all subscriber notifications to a single notification fired when `fn` completes. Nested `batch()` calls are supported — the notification fires when the outermost batch exits.

```ts
// Three add() calls — subscribers notified exactly once
i18n.batch(() => {
  i18n.add('en', moduleA);
  i18n.add('en', moduleB);
  i18n.add('en', moduleC);
});
```

### `has(key)` and `hasOwn(key)` and `hasLocale(locale)`

`has(key)` checks whether a key resolves in the **active locale**, walking the fallback chain. `hasOwn(key)` checks only the active locale itself — no fallback. Use `withLocale(locale).has(key)` or `withLocale(locale).hasOwn(key)` to check a specific locale.

```ts
// Active locale is 'fr', fallback is 'en'
i18n.has('greeting');                   // true (found via fallback)
i18n.hasOwn('greeting');                // false (not in 'fr' itself)
i18n.withLocale('en').hasOwn('greeting'); // true
i18n.hasLocale('de');                   // true if 'de' catalog is loaded
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
const unsub = i18n.subscribe(({ locale, reason }) => {
  console.log(`Locale: ${locale}, reason: ${reason}`);
  rerender();
});

// Fire immediately with the current locale
const unsub2 = i18n.subscribe(({ locale }) => init(locale), true);

// Unsubscribe
unsub();
unsub2();

// Release all resources explicitly
i18n.dispose();

// Or deterministically with `using`
{
  using i18n = createI18n({ locale: 'en', messages: { en } });
  // ... use i18n
} // dispose() called automatically

// Or with `await using` to drain in-flight loaders first
{
  await using i18n = createI18n({ locale: 'en', loaders: { fr: loadFr } });
  // ... use i18n
} // awaits any pending loads, then disposes
```

## Best Practices

- **Provide a `fallback` locale** in production to ensure graceful degradation when a key is missing.
- **Use `setLocale()` over `i18n.locale =`** when the target locale has a registered loader — it prevents a flash of untranslated content.
- **Use `batch()` when hydrating multiple chunks** at startup to avoid triggering a re-render per `add()` call.
- **Use `scope(ns)` in components** to avoid repeating the namespace prefix.
- **Use `withLocale(locale)` on the server** to translate responses for multiple users without changing the global active locale.
- **Use `withLocale(locale).has(key)` / `withLocale(locale).hasOwn(key)`** to query a specific locale — `has()` and `hasOwn()` always operate on the active locale.
- **Register loaders at startup** via `loaders` in `createI18n()` rather than calling `registerLoader()` later, so the loader map is complete before any locale switch.
- **Keep `onMissing` quiet in development** — log the key — and throw (or track) in CI to catch missing translations early.
- **Use `onDiagnostic` instead of `try/catch` around loaders** — it receives typed `DiagnosticEvent` with the failing `locale` for `loader-error` events.

## Next Steps

|                           |                                                   |
| ------------------------- | ------------------------------------------------- |
| [API Reference](./api.md) | Complete type signatures and method reference     |
| [Examples](./examples.md) | Real-world i18n recipes                           |
