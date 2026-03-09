---
title: I18nit — API Reference
description: Complete API reference for I18nit internationalization.
---

# I18nit API Reference

[[toc]]

## Types

### `Locale`

```ts
type Locale = string;
```

A locale identifier such as `'en'`, `'fr'`, `'en-US'`, or `'zh-Hant'`.



### `PluralForm`

```ts
type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
```

Plural category determined automatically by `Intl.PluralRules`. The six forms cover every language in the Unicode CLDR:

| Languages | Forms used |
|---|---|
| English, German, Spanish, … | `one`, `other` |
| French | `one` (0–1), `other` |
| Arabic | `zero`, `one`, `two`, `few`, `many`, `other` |
| Russian, Polish | `one`, `few`, `many`, `other` |
| Chinese, Japanese, … | `other` only |



### `PluralMessages`

```ts
type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };
```

Object holding plural forms for a message. `other` is the only required form; omitted forms fall back to it.

```ts
const messages = {
  items: {
    zero: 'No items',
    one: 'One item',
    other: '{count} items',
  },
};
```



### `MessageValue`

```ts
type MessageValue = string | PluralMessages;
```

A translation value — either a plain string or a pluralised form object.



### `Messages`

```ts
type Messages = {
  [key: string]: MessageValue | Messages;
};
```

A catalog of translations for one locale. Supports both flat dot-notation keys and nested objects — both are accessed the same way:

```ts
// Flat
const flat: Messages = { 'nav.home': 'Home', 'nav.about': 'About' };

// Nested (equivalent)
const nested: Messages = { nav: { home: 'Home', about: 'About' } };

i18n.t('nav.home'); // "Home" — works for both
```



### `FlatKeys<T>`

```ts
type FlatKeys<T extends Messages, P extends string = ''> = /* recursive */;
```

Recursive utility type that derives all valid dot-notation translation keys from a `Messages` shape. Used to constrain `t()` when the instance is created with a concrete message type.

```ts
const i18n = createI18n({
  messages: { en: { nav: { home: 'Home' }, title: 'App' } },
});

i18n.t('nav.home'); // ✅ — key inferred from shape
i18n.t('typo');     // ❌ — TypeScript error
```

To opt out of key narrowing (e.g. for dynamically-keyed lookups), pass `Messages` as the type argument:

```ts
const i18n = createI18n<Messages>({ messages: { en: { ... } } });
i18n.t('any.key'); // accepts any string
```



### `Loader`

```ts
type Loader = (locale: Locale) => Promise<Messages>;
```

An async function that receives the requested locale and returns its message catalog.



### `I18nConfig<T>`

```ts
type I18nConfig<T extends Messages = Messages> = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<string, T>;
  loaders?: Record<Locale, Loader>;
};
```

Configuration object for `createI18n()`.

| Property | Type | Default | Description |
|---|---|---|---|
| `locale` | `Locale` | `'en'` | Active locale |
| `fallback` | `Locale \| Locale[]` | `[]` | Fallback locale(s) for missing keys |
| `messages` | `Record<string, T>` | — | Pre-loaded message catalogs |
| `loaders` | `Record<Locale, Loader>` | — | Async loaders for lazy locale bundles |

---

### `ScopedI18n`

```ts
type ScopedI18n = {
  t(key: string, vars?: Record<string, unknown>): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  namespace(ns: string): NamespacedI18n;
};
```

A locale-bound translator returned by `scoped()`. Translates in the specified locale without changing the active one.

---

### `NamespacedI18n`

```ts
type NamespacedI18n = {
  t(key: string, vars?: Record<string, unknown>): string;
  has(key: string): boolean;
};
```

A key-prefix-scoped translator returned by `namespace()` and `scoped().namespace()`.

---

### `I18nInstance<T>`

```ts
type I18nInstance<T extends Messages = Messages> = ReturnType<typeof createI18n<T>>;
```

Convenience alias for the `I18n` instance type.

---

## `createI18n(config?)`

```ts
function createI18n<T extends Messages = Messages>(config?: I18nConfig<T>): I18n<T>
```

Creates and returns a new `I18n` instance.

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!' },
    es: { greeting: '¡Hola, {name}!' },
  },
  loaders: {
    fr: async () => import('./locales/fr.json').then((m) => m.default),
    de: async (locale) => fetch(`/locales/${locale}.json`).then((r) => r.json()),
  },
});
```

---

## `I18n` Instance

### `locale` (property)

```ts
get locale(): Locale
set locale(value: Locale)
```

Reads or sets the active locale. Setting a new value notifies all subscribers. Setting the same value is a no-op.

```ts
console.log(i18n.locale); // "en"
i18n.locale = 'fr';
console.log(i18n.locale); // "fr"
```

---

### `t(key, vars?)`

```ts
t(
  key: [FlatKeys<T>] extends [never] ? string : FlatKeys<T> & string,
  vars?: Record<string, unknown>,
): string
```

Translates `key` using the active locale, falling back through the chain when the key is missing. Returns the key itself when no translation is found.

**Interpolation formats supported:**

| Syntax | Description |
|---|---|
| `{name}` | Simple variable |
| `{user.name}` | Nested object property |
| `{items[0]}` | Array index (empty string when out of bounds) |
| `{items}` | Array joined with `', '` |
| `{items\|and}` | Array joined with locale-aware "and" (`Intl.ListFormat`) |
| `{items\|or}` | Array joined with locale-aware "or" (`Intl.ListFormat`) |
| `{items\| – }` | Array joined with a custom separator |
| `{items.length}` | Array length |

Number variables are auto-formatted via `Intl.NumberFormat`. `null` / `undefined` variables produce an empty string.

```ts
i18n.t('greeting', { name: 'Alice' });                    // "Hello, Alice!"
i18n.t('nav.home');                                        // "Home"
i18n.t('items', { count: 5 });                             // "5 items"
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] }); // "Alice, Bob, and Charlie"
```

---

### `number(value, options?, locale?)`

```ts
number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string
```

Formats a number using `Intl.NumberFormat`. Uses the active locale when `locale` is not supplied. Falls back to `String(value)` on `Intl` errors.

```ts
i18n.number(1234.56);                                           // "1,234.56"
i18n.number(99.99, { style: 'currency', currency: 'USD' });    // "$99.99"
i18n.number(0.856, { style: 'percent' });                      // "85.6%"
i18n.number(1234.56, undefined, 'de');                         // "1.234,56"
```

---

### `date(value, options?, locale?)`

```ts
date(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: Locale): string
```

Formats a `Date` or a numeric timestamp using `Intl.DateTimeFormat`. Uses the active locale when `locale` is not supplied.

```ts
const d = new Date('2024-01-15');

i18n.date(d);                               // "1/15/2024"
i18n.date(d, { dateStyle: 'long' });        // "January 15, 2024"
i18n.date(d.getTime());                     // numeric timestamp works too
i18n.date(d, { dateStyle: 'long' }, 'fr'); // "15 janvier 2024"
```

---

### `namespace(ns)`

```ts
namespace(ns: string): NamespacedI18n
```

Returns an object with `t` and `has` methods whose keys are automatically prefixed with `ns + '.'`.

```ts
const errors = i18n.namespace('errors');

errors.t('required');          // same as i18n.t('errors.required')
errors.t('min', { min: 8 });   // same as i18n.t('errors.min', { min: 8 })
errors.has('required');        // same as i18n.has('errors.required')
```

---

### `scoped(locale)`

```ts
scoped(locale: Locale): ScopedI18n
```

Returns a `ScopedI18n` object that translates, formats, and creates namespaces using `locale` — without changing the active locale on the instance. Useful for SSR, multi-locale rendering, and testing.

```ts
const fr = i18n.scoped('fr');

fr.t('greeting', { name: 'Alice' }); // "Bonjour, Alice!"
fr.number(1234.56);                  // French number formatting
fr.date(new Date());                 // French date formatting
fr.namespace('nav').t('home');       // French nav.home

console.log(i18n.locale);           // still "en"
```

---

### `add(locale, messages)`

```ts
add(locale: Locale, messages: Messages): void
```

Deep-merges `messages` into the existing catalog for `locale`. Notifies subscribers when `locale` is part of the active locale chain.

```ts
i18n.add('en', { user: { title: 'Profile' } });
// Existing keys under 'user' are preserved
```

---

### `replace(locale, messages)`

```ts
replace(locale: Locale, messages: Messages): void
```

Replaces the entire catalog for `locale`. All previously loaded keys for that locale are discarded. Notifies subscribers when `locale` is part of the active locale chain.

```ts
i18n.replace('en', { greeting: 'Greetings!' });
// Previous 'en' messages no longer exist
```

---

### `has(key, locale?)`

```ts
has(key: string, locale?: Locale): boolean
```

Returns `true` if `key` resolves to a translation. Uses the active locale when `locale` is not provided.

```ts
i18n.has('greeting');        // true
i18n.has('greeting', 'fr');  // true/false depending on catalog
i18n.has('typo');            // false
```

---

### `hasLocale(locale)`

```ts
hasLocale(locale: Locale): boolean
```

Returns `true` if a catalog has been registered (via `messages` config or `add()` / `load()`) for `locale`.

```ts
i18n.hasLocale('en'); // true
i18n.hasLocale('zh'); // false
```

---

### `addLoader(locale, loader)`

```ts
addLoader(locale: Locale, loader: Loader): void
```

Registers an async loader for `locale` after instance creation.

```ts
i18n.addLoader('ja', async () => import('./locales/ja.json').then((m) => m.default));
await i18n.load('ja');
```

---

### `load(locale)`

```ts
async load(locale: Locale): Promise<void>
```

Calls the registered loader for `locale` and merges the result into the catalog via `add()`. Deduplicates concurrent calls — multiple simultaneous `load('es')` calls trigger the loader only once. Is a no-op when the catalog is already populated.

```ts
// Load one locale
await i18n.load('es');
i18n.locale = 'es';

// Preload several in parallel
await Promise.all([i18n.load('fr'), i18n.load('de')]);

// Error is thrown (and re-thrown on retry)
await i18n.load('xx'); // throws if loader rejects
```

---

### `subscribe(handler)`

```ts
subscribe(handler: (locale: Locale) => void): () => void
```

Registers a handler that is called immediately with the current locale and again whenever the locale changes. Returns an unsubscribe function. Handler errors are swallowed.

```ts
const unsub = i18n.subscribe((locale) => {
  document.documentElement.lang = locale;
});

// Stop listening
unsub();
```

---

### `dispose()`

```ts
dispose(): void
```

Removes all subscribers. Subsequent locale changes produce no notifications.

```ts
i18n.dispose();
```
