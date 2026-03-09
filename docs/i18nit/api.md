---
title: I18nit — API Reference
description: Complete API reference for i18nit — types, createI18n factory, I18n instance methods, and BoundI18n interface.
---

## I18nit API Reference

[[toc]]

## Types

### `Locale`

```ts
type Locale = string;
```

A BCP 47 locale tag, e.g. `'en'`, `'en-US'`, `'fr'`, `'zh-Hans'`.

---

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

Returned by `subscribe()`. Call to remove the listener.

---

### `PluralForm`

```ts
type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
```

The six `Intl.PluralRules` plural categories.

---

### `PluralMessages`

```ts
type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };
```

A message object with plural forms. `other` is required; remaining forms are optional.

```ts
const files: PluralMessages = {
  zero: 'No files',
  one: 'One file',
  other: '{count} files',
};
```

---

### `MessageValue`

```ts
type MessageValue = string | PluralMessages;
```

A leaf in the messages tree — either a plain string or a plural messages object.

---

### `Messages`

```ts
type Messages = { [key: string]: MessageValue | Messages };
```

Recursive message catalog type. Keys map to strings, plural objects, or nested `Messages`.

---

### `Vars`

```ts
type Vars = Record<string, unknown>;
```

Interpolation variables passed to `t(key, vars)`.

---

### `TranslationKey<T>`

```ts
type TranslationKey<T extends Messages, P extends string = '', D extends unknown[] = []> = D['length'] extends 8
  ? string
  : {
      [K in keyof T & string]: T[K] extends Messages
        ? TranslationKey<T[K], `${P}${K}.`, [...D, 0]> | `${P}${K}`
        : `${P}${K}`;
    }[keyof T & string];
```

Recursively extracts all valid dot-notation key paths from a `Messages` type up to 8 levels deep.

```ts
type M = { nav: { home: string }; title: string };
type K = TranslationKey<M>; // "nav.home" | "title"
```

Only leaf keys are included — intermediate namespace keys like `"nav"` are excluded.

---

### `DeepPartialMessages<T>`

```ts
type DeepPartialMessages<T extends Messages> = {
  [K in keyof T]?: T[K] extends MessageValue
    ? MessageValue
    : T[K] extends Messages
      ? DeepPartialMessages<T[K]>
      : MessageValue;
};
```

Recursively makes all message keys optional. Use when a secondary locale only translates a subset of the primary locale's messages, and you want compile-time safety for those keys:

```ts
type M = { greeting: string; nav: { home: string; about: string } };
const fr: DeepPartialMessages<M> = { nav: { home: 'Accueil' } }; // ✓ — partial is fine
```

---

### `LocaleChangeReason`

```ts
type LocaleChangeReason = 'locale-change' | 'catalog-update';
```

Describes why a `subscribe()` listener was invoked.

| Value              | When fired                                                          |
| ------------------ | ------------------------------------------------------------------- |
| `'locale-change'`  | The active locale was switched via `locale` setter or `setLocale()` |
| `'catalog-update'` | `add()` or `replace()` was called for the currently active locale   |

---

### `LocaleChangeEvent`

```ts
type LocaleChangeEvent = { locale: Locale; reason: LocaleChangeReason };
```

Payload passed to every `subscribe()` listener.

---

### `Loader`

```ts
type Loader = (locale: Locale) => Promise<Messages>;
```

An async function that returns messages for a given locale. Used with `registerLoader()` and the `loaders` option.

---

### `I18nOptions<T>`

```ts
type I18nOptions<T extends Messages = Messages> = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<string, T>;
  loaders?: Record<Locale, Loader>;
  onMissing?: (key: string, locale: Locale) => string | undefined;
  onError?: (err: unknown, context: 'subscriber' | 'loader') => void;
};
```

Configuration object for `createI18n()`.

| Option      | Type                                   | Default | Description                                                                                                           |
| ----------- | -------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `locale`    | `Locale`                               | `'en'`  | Initial active locale                                                                                                 |
| `fallback`  | `Locale \| Locale[]`                   | —       | Fallback locale(s) for missing keys                                                                                   |
| `messages`  | `Record<string, T>`                    | —       | Static message bundles loaded at startup. Each bundle is deep-cloned on construction                                  |
| `loaders`   | `Record<Locale, Loader>`               | —       | Async loaders for on-demand locale bundles                                                                            |
| `onMissing` | `(key, locale) => string \| undefined` | —       | Custom handler for missing translation keys; return a string to use as the fallback, or `undefined` to return the key |
| `onError`   | `(err, context) => void`               | —       | Custom handler for subscriber errors and loader failures. Defaults to `console.error` / `console.warn`                |

---

### `BoundI18n<T>`

```ts
type BoundI18n<T extends Messages = Messages> = {
  readonly locale: Locale;
  t(key: TranslationKey<T> | (string & {}), vars?: Vars): string;
  has(key: string): boolean;
  hasOwn(key: string): boolean;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  list(items: unknown[], type?: 'and' | 'or'): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string;
  scope<K extends keyof T & string>(ns: K): T[K] extends Messages ? BoundI18n<T[K]> : never;
  withLocale(locale: Locale): BoundI18n<T>;
};
```

A generic locale-bound or namespace-bound view of an `I18n` instance. `I18n<T>` itself implements `BoundI18n<T>`. Returned by `scope()` and `withLocale()`.

The type parameter `T` narrows `t()` autocomplete and `scope()` return types to the message subtree.

## `createI18n(config?)` {#createi18n}

```ts
function createI18n<T extends Messages = Messages>(config?: I18nOptions<T>): I18n<T>;
```

Factory function that creates and returns a new `I18n` instance.

**Parameters:**

- `config?` — Optional `I18nOptions<T>` configuration.

**Returns:** `I18n<T>`

```ts
const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
});
```

## `I18n<T>` Instance {#i18n-instance}

### `locale` (get/set)

```ts
get locale(): Locale
set locale(value: Locale)
```

Gets or sets the active locale. Setting the locale synchronously switches the active locale without loading. Use `setLocale()` for async loading.

```ts
console.log(i18n.locale); // "en"
i18n.locale = 'de';
```

---

### `locales`

```ts
get locales(): Locale[]
```

Returns an array of all locale keys that have a catalog loaded (either via `messages`, `add()`, or a completed loader).

```ts
console.log(i18n.locales); // ["en", "de", "fr"]
```

---

### `setLocale(locale)`

```ts
async setLocale(locale: Locale): Promise<void>
```

Loads the locale via its registered loader (if not already loaded), then atomically switches the active locale. No-op if the locale is already active.

```ts
await i18n.setLocale('fr');
i18n.t('greeting'); // translated in French
```

---

### `add(locale, messages)`

```ts
add(locale: Locale, messages: Messages): void
```

Deep-merges `messages` into the existing catalog for `locale`. Existing keys are preserved; only new or updated keys are written.

```ts
i18n.add('en', { nav: { settings: 'Settings' } });
```

---

### `replace(locale, messages)`

```ts
replace(locale: Locale, messages: Messages): void
```

Replaces the entire catalog for `locale` with a deep clone of `messages`. All previous entries for that locale are discarded.

```ts
i18n.replace('en', await fetchMessages('en'));
```

---

### `has(key, locale?)`

```ts
has(key: string, locale?: Locale): boolean
```

Returns `true` if the key resolves to a translation in the given locale (or the active locale if omitted), walking the fallback chain.

```ts
i18n.has('nav.home'); // check in active locale
i18n.has('nav.home', 'de'); // check in 'de' locale
```

---

### `hasOwn(key, locale?)`

```ts
hasOwn(key: string, locale?: Locale): boolean
```

Returns `true` if the key resolves to a translation in the exact given locale (or the active locale if omitted), **without** walking the fallback chain.

Use `has()` when you want fallback-aware lookup; use `hasOwn()` when you specifically need to know whether a locale has its own translation.

```ts
i18n.hasOwn('nav.home'); // check in active locale only
i18n.hasOwn('nav.home', 'de'); // check in 'de' only, no fallback
```

---

### `hasLocale(locale)`

```ts
hasLocale(locale: Locale): boolean
```

Returns `true` if a message catalog has been loaded for `locale`.

```ts
i18n.hasLocale('de'); // true if 'de' messages have been loaded
```

---

### `load(...locales)`

```ts
async load(...locales: Locale[]): Promise<void>
```

Invokes the registered loaders for the given locales and merges the results into the catalogs. Already-loaded locales are skipped.

```ts
await i18n.load('fr', 'de');
```

---

### `registerLoader(locale, loader)`

```ts
registerLoader(locale: Locale, loader: Loader): void
```

Registers an async loader for a locale. The loader is invoked on the first `setLocale()` or `load()` call for that locale.

```ts
i18n.registerLoader('ja', () => import('./locales/ja.json'));
await i18n.setLocale('ja');
```

---

### `loadableLocales`

```ts
get loadableLocales(): Locale[]
```

Returns the locale keys for which a loader has been registered via `loaders` option or `registerLoader()`. The list is cached and invalidated automatically when a new loader is registered.

```ts
i18n.registerLoader('ja', () => import('./locales/ja.json'));
console.log(i18n.loadableLocales); // ['ja']
```

---

### `t(key, vars?)`

```ts
t(key: TranslationKey<T> | (string & {}), vars?: Vars): string
```

Translates `key` in the active locale. If `vars` are provided, interpolates `{placeholder}` patterns in the resolved message. For plural messages, selects the correct form using `Intl.PluralRules` and the `count` variable.

Returns the key itself if no translation is found and `onMissing` is not set (or if `onMissing` returns `undefined`).

```ts
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('files', { count: 2 }); // "2 files"
```

---

### `number(value, options?)`

```ts
number(value: number | bigint, options?: Intl.NumberFormatOptions): string
```

Formats `value` with `Intl.NumberFormat` using the active locale.

```ts
i18n.number(1234567.89); // "1,234,567.89"
i18n.number(0.42, { style: 'percent' }); // "42%"
```

---

### `date(value, options?)`

```ts
date(value: Date | number, options?: Intl.DateTimeFormatOptions): string
```

Formats `value` with `Intl.DateTimeFormat` using the active locale.

```ts
i18n.date(new Date(), { dateStyle: 'long' }); // "January 1, 2025"
```

---

### `list(items, type?)`

```ts
list(items: Iterable<string>, type?: 'and' | 'or'): string
```

Formats `items` with `Intl.ListFormat` using the active locale. `type` defaults to `'and'` (conjunction).

```ts
i18n.list(['Alice', 'Bob', 'Charlie']); // "Alice, Bob, and Charlie"
i18n.list(['Alice', 'Bob', 'Charlie'], 'or'); // "Alice, Bob, or Charlie"
```

---

### `relative(value, unit, options?)`

```ts
relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string
```

Formats a relative time with `Intl.RelativeTimeFormat` using the active locale.

```ts
i18n.relative(-3, 'day'); // "3 days ago"
i18n.relative(1, 'hour'); // "in 1 hour"
```

---

### `currency(value, currency, options?)`

```ts
currency(value: number | bigint, currency: string, options?: Intl.NumberFormatOptions): string
```

Formats `value` as a currency amount using `Intl.NumberFormat` with `style: 'currency'`.

```ts
i18n.currency(9.99, 'USD'); // "$9.99"
i18n.currency(9.99, 'EUR'); // "€9.99"
```

---

### `scope(ns)`

```ts
scope<K extends keyof T & string>(ns: K): T[K] extends Messages ? BoundI18n<T[K]> : never
```

Returns a `BoundI18n` narrowed to the subtree type `T[K]`, where all `t()` calls are prefixed by `ns + '.'`. It always uses the current active locale. Calling `scope()` on a leaf key (a key that resolves to a string or plural object, not a namespace) produces a `never` — a compile-time error.

```ts
const auth = i18n.scope('auth');
auth.t('login'); // i18n.t('auth.login')
```

---

### `withLocale(locale)`

```ts
withLocale(locale: Locale): BoundI18n<T>
```

Returns a `BoundI18n<T>` that always translates in `locale`, regardless of the active locale. Useful for SSR where multiple user locales may be needed concurrently.

```ts
const fr = i18n.withLocale('fr');
fr.t('greeting'); // always in French
```

---

### `subscribe(listener, immediate?)`

```ts
subscribe(listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe
```

Registers a listener that is called whenever the active locale changes or the active locale's catalog is updated. If `immediate` is `true`, the listener is also called immediately with the current locale and reason `'locale-change'`.

Returns an `Unsubscribe` function.

```ts
const unsub = i18n.subscribe(({ locale, reason }) => {
  console.log(`Locale is now "${locale}" (reason: ${reason})`);
}, true);
unsub(); // remove listener
```

---

### `dispose()`

```ts
dispose(): void
```

Releases all resources held by this instance: clears all subscribers, message catalogs, registered loaders, in-flight loader promises, and internal caches. After calling `dispose()`, the instance is effectively empty — `t()` returns keys as-is, `locales` is `[]`.

See also `[Symbol.dispose]()` for `using` statement support.

```ts
i18n.dispose();
```

---

### `[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Calls `dispose()`. Enables deterministic resource release via the `using` statement (TypeScript 5.2+, `lib: ["ESNext.Disposable"]`).

```ts
{
  using i18n = createI18n({ locale: 'en', messages: { en } });
  // ... use i18n
} // dispose() is called automatically here
```
