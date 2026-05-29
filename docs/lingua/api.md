---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API At a Glance

| Symbol              | Purpose                                       | Execution mode | Common gotcha                                                |
| ------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `createI18n()`      | Create an i18n instance with locale catalogs  | Sync           | Catalogs are lazy; call `preload()` before SSR render        |
| `i18n.t()`          | Translate a leaf key with optional vars       | Sync           | Missing keys use `onMissing` or return the key itself        |
| `i18n.tp()`         | Translate a plural branch key                 | Sync           | `count` is injected automatically — do not pass it in `vars` |
| `i18n.setLocale()`  | Switch the active locale                      | Async          | Await before rendering; throws if locale is not registered   |
| `i18n.preload()`    | Pre-load a locale catalog without switching   | Async          | Locale must be registered first                              |
| `i18n.register()`   | Replace a locale's full catalog at runtime    | Sync           | Replaces entirely — use `merge()` to add keys                |
| `i18n.merge()`      | Overlay additional keys onto a catalog        | Async          | Does not replace; a later `register()` discards merge deltas |
| `i18n.scope()`      | Return a prefix-bound `{ t, tp, has }` helper | Sync           | Returns a new object on every call                           |
| `createFormatter()` | Create a standalone Intl formatter            | Sync           | Pass a getter `() => i18n.locale` to follow locale changes   |

## Package Entry Point

| Import                    | Purpose                             |
| ------------------------- | ----------------------------------- |
| `@vielzeug/lingua`        | Main exports and types              |
| `@vielzeug/lingua/format` | `createFormatter` and related types |

## createI18n

```ts
createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>
createI18n(options?: I18nOptions<Messages>): I18n<Messages>
```

Creates an i18n instance. All locale strings must be valid BCP 47 tags. Invalid tags throw `[lingua/E004]`.

**Parameters — `I18nOptions<M>`:**

| Option              | Type                              | Default     | Description                                                             |
| ------------------- | --------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `locale`            | `Locale`                          | `'en'`      | Active locale at startup. Must be a valid BCP 47 tag.                   |
| `fallback`          | `Locale \| Locale[]`              | `undefined` | Fallback locale chain searched when the active locale is missing a key. |
| `catalogs`          | `Record<Locale, LocaleSource<M>>` | `{}`        | Locale source registry. Values are static objects or async loaders.     |
| `onMissing`         | `(info: MissingInfo) => string`   | `undefined` | Called for missing keys and unresolved interpolation variables.         |
| `onSubscriberError` | `(error: unknown) => void`        | no-op       | Called when a `subscribe` callback throws.                              |

**Returns:** `I18n<M>`

**Example:**

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  catalogs: {
    en: { greeting: 'Hello, {name}!' },
    de: () => import('./locales/de.json').then((m) => m.default),
  },
  onMissing: (info) => (info.type === 'key' ? `[missing:${info.key}]` : `{${info.varName}}`),
});
```

---

## I18n Interface

Every `createI18n` call returns an `I18n<M>` instance.

**Methods:**

| Member                          | Signature                                                                                          | Description                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `t(key, vars?)`                 | `(key: MessageLeafKeys<M> \| AnyKey, vars?: TranslateVars) => string`                              | Translate a leaf key with optional variable interpolation.         |
| `tp(key, count, options?)`      | `(key: MessageBranchKeys<M> \| AnyKey, count: number, options?: PluralTranslateOptions) => string` | Translate a plural branch key.                                     |
| `preload(locale)`               | `(locale: Locale) => Promise<void>`                                                                | Load a catalog without switching the active locale.                |
| `setLocale(locale)`             | `(locale: Locale) => Promise<void>`                                                                | Load if needed, then switch and bump version.                      |
| `register(locale, source)`      | `(locale: Locale, source: LocaleSource<M>) => void`                                                | Replace the full catalog for a locale. Notifies subscribers.       |
| `merge(locale, source)`         | `(locale: Locale, source: LocaleSource<M>) => Promise<void>`                                       | Overlay keys onto an existing catalog. See [`merge()`](#merge).    |
| `scope(prefix)`                 | `(prefix: MessageBranchKeys<M> \| AnyKey) => ScopedI18n`                                           | Return a prefix-bound helper. See [`scope()`](#scope).             |
| `has(key)`                      | `(key: MessageLeafKeys<M> \| AnyKey) => boolean`                                                   | Check if a leaf key exists in the active fallback chain.           |
| `getSupportedLocales(options?)` | `(options?: SupportedLocalesOptions) => Locale[]`                                                  | List registered locales. `{ sorted: true }` gives code-point order.|
| `getSnapshot()`                 | `() => I18nSnapshot`                                                                               | Return the current `{ locale, version }` snapshot.                 |
| `subscribe(callback, options?)` | `(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions) => Unsubscribe`          | Subscribe to locale/content changes.                               |

**Properties:**

| Member   | Type        | Description                                                                                          |
| -------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `locale` | `Locale`    | Readonly. Current active locale string.                                                              |
| `fmt`    | `Formatter` | Lazy-initialised formatter tied to this instance. Invalidates cached `Intl` objects on locale change.|

### `t()`

Resolves a leaf key against the active fallback chain and interpolates variables.

```ts
i18n.t('greeting', { name: 'Alice' }); // => 'Hello, Alice!'
```

Missing keys call `onMissing({ type: 'key', key, locale })`. Without `onMissing`, returns the key string.
Unresolved variables call `onMissing({ type: 'var', key, locale, varName })`. Without `onMissing`, keeps the `{varName}` placeholder.

### `tp()`

Resolves a plural branch key using CLDR rules. For cardinal plurals, `count=0` checks `${key}.zero` before falling back to the CLDR-selected form. Ordinal plurals follow CLDR exclusively.

```ts
i18n.tp('inbox', 0);                       // => 'No messages'  (from inbox.zero)
i18n.tp('inbox', 1);                       // => 'One message'
i18n.tp('inbox', 5);                       // => '5 messages'
i18n.tp('position', 2, { ordinal: true }); // => '2nd'
```

`count` is injected automatically. Do not include `count` in `vars`.

### `merge()`

```ts
merge(locale: Locale, source: LocaleSource<M>): Promise<void>
```

Loads `source` and writes its keys into the existing catalog for `locale`. Keys absent from `source` are preserved.

- Waits for any in-flight dynamic load on the target locale before applying.
- Bumps the version and notifies subscribers only when the merged locale is in the active fallback chain.
- If the locale has never been registered, a new catalog is created from the merge source alone.
- Concurrent merges are safe — last write wins per key.
- A subsequent `register(locale, source)` replaces the full catalog; merge deltas are discarded.

```ts
async function onEnterSettings() {
  await i18n.merge('en', () => import('./routes/settings.i18n.json').then((m) => m.default));
}
```

### `scope()`

```ts
scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n
```

Returns a `{ t, tp, has }` helper where every key is automatically prefixed with `prefix + '.'`.

```ts
const nav = i18n.scope('nav');
nav.t('home');      // equivalent to i18n.t('nav.home')
nav.has('logout');  // equivalent to i18n.has('nav.logout')
nav.tp('items', 3); // equivalent to i18n.tp('nav.items', 3)
```

`scope()` returns a new object on every call — do not compare references across calls.

### `subscribe()`

```ts
subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe
```

Registers a callback that runs on locale or catalog changes. Returns an `Unsubscribe` function.
Pass `{ immediate: true }` to call the callback immediately with the current snapshot.

```ts
const stop = i18n.subscribe(({ locale }) => {
  document.documentElement.lang = locale;
}, { immediate: true });

stop(); // unsubscribe
```

---

## createFormatter

```ts
import { createFormatter } from '@vielzeug/lingua/format';

createFormatter(source: string | (() => string)): Formatter
```

Creates an Intl formatter. Pass a static locale string or a getter that reads the current locale.

**Parameters:**

| Parameter | Type                       | Description                                                                 |
| --------- | -------------------------- | --------------------------------------------------------------------------- |
| `source`  | `string \| (() => string)` | Static locale string, or a getter called on every format method invocation. |

**Returns:** `Formatter`

**Example:**

```ts
import { createFormatter } from '@vielzeug/lingua/format';

// Follows locale changes automatically
const fmt = createFormatter(() => i18n.locale);

fmt.number(1_234_567.89);
fmt.currency(19.99, 'EUR');
fmt.date(new Date(), { dateStyle: 'medium' });
fmt.relative(-3, 'day');
fmt.list(['apples', 'bananas', 'oranges']);
fmt.duration({ hours: 1, minutes: 30 });
```

**Methods:**

| Method                                | Intl primitive            | Description                              |
| ------------------------------------- | ------------------------- | ---------------------------------------- |
| `number(value, options?)`             | `Intl.NumberFormat`       | Format a number                          |
| `currency(value, currency, options?)` | `Intl.NumberFormat`       | Format a number as currency              |
| `date(value, options?)`               | `Intl.DateTimeFormat`     | Format a `Date` or timestamp             |
| `relative(value, unit, options?)`     | `Intl.RelativeTimeFormat` | Format a relative time value             |
| `list(value, options?)`               | `Intl.ListFormat`         | Join an array into a locale-aware string |
| `duration(value, options?)`           | `Intl.DurationFormat`     | Format a duration object                 |
| `clear()`                             | —                         | Evict all cached `Intl` instances        |

---

## Types

### `I18n<M>`

The object returned by `createI18n`. See the [I18n Interface](#i18n-interface) section for member documentation.

### `I18nOptions<M>`

```ts
type I18nOptions<M extends Messages = Messages> = {
  catalogs?: Record<Locale, LocaleSource<M>>;
  fallback?: Locale | Locale[];
  locale?: Locale;
  onMissing?: (info: MissingInfo) => string;
  onSubscriberError?: (error: unknown) => void;
};
```

### `I18nSnapshot`

```ts
type I18nSnapshot = {
  readonly locale: Locale;
  readonly version: number;
};
```

`version` starts at `0` and increments by `1` on every observable change.

### `MissingInfo`

```ts
type MissingInfo =
  | { key: string; locale: Locale; type: 'key' }
  | { key: string; locale: Locale; type: 'var'; varName: string };
```

`type: 'key'` — the translation key was not found. `type: 'var'` — an interpolation variable was not supplied.

### `Messages`

```ts
interface Messages {
  [key: string]: string | Messages;
}
```

Shape of a locale catalog. Leaf values are strings; branch values are nested `Messages` objects.

### `LocaleSource<M>`

```ts
type LocaleSource<M extends Messages = Messages> = M | Loader<M>;
```

### `Loader<M>`

```ts
type Loader<M extends Messages = Messages> = () => Promise<M>;
```

### `ScopedI18n`

```ts
type ScopedI18n = {
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, options?: PluralTranslateOptions): string;
};
```

Returned by `i18n.scope(prefix)`.

### `PluralTranslateOptions`

```ts
type PluralTranslateOptions = {
  ordinal?: boolean;
  vars?: TranslateVars;
};
```

### `SubscribeOptions`

```ts
type SubscribeOptions = {
  immediate?: boolean;
};
```

### `SupportedLocalesOptions`

```ts
type SupportedLocalesOptions = {
  sorted?: boolean;
};
```

### `TranslateVars`

```ts
type TranslateVars = Record<string, unknown>;
```

### `Locale`

```ts
type Locale = string;
```

A BCP 47 language tag (e.g. `'en'`, `'en-US'`, `'zh-Hant-TW'`).

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

### `MessageLeafKeys<T>`

Recursively infers all dot-separated paths to `string` leaf values in a `Messages` type. Constrains the `key` parameter of `t()` and `has()`.

```ts
type MessageLeafKeys<T, P extends string = '', D extends number = 7> = /* recursive conditional type */
```

### `MessageBranchKeys<T>`

Recursively infers all dot-separated paths to non-string (branch) values in a `Messages` type. Constrains the `key` parameter of `tp()` and `scope()`.

```ts
type MessageBranchKeys<T, P extends string = '', D extends number = 7> = /* recursive conditional type */
```

### `Formatter`

```ts
type Formatter = {
  clear(): void;
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  duration(value: DurationValue, options?: DurationFormatOptions): string;
  list(value: Array<string | number | boolean>, options?: ListFormatOptions): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
};
```

### `DurationValue`

```ts
type DurationValue = Partial<
  Record<'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'months' | 'nanoseconds' | 'seconds' | 'weeks' | 'years', number>
>;
```

### `DurationFormatOptions`

```ts
type DurationFormatOptions = {
  hours?: '2-digit' | 'numeric';
  microseconds?: 'numeric';
  milliseconds?: 'numeric';
  minutes?: '2-digit' | 'numeric';
  nanoseconds?: 'numeric';
  seconds?: '2-digit' | 'numeric';
  style?: 'digital' | 'long' | 'narrow' | 'short';
};
```

### `ListFormatOptions`

```ts
type ListFormatOptions = {
  style?: 'long' | 'narrow' | 'short';
  type?: 'and' | 'or';
};
```

---

## Errors

| Error code      | When thrown                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `[lingua/E001]` | `setLocale()` is called with a locale that has no registered source.                                     |
| `[lingua/E004]` | Any API receives a string that is not a valid BCP 47 tag (`createI18n`, `setLocale`, `register`, `merge`). |
