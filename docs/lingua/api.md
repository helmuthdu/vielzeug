---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API At a Glance

| Symbol                     | Purpose                                              | Execution mode | Common gotcha                                                        |
| -------------------------- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| `createI18n()`             | Create an i18n instance with locale catalogs         | Sync           | Catalogs are lazy; call `preload()` before SSR render                |
| `i18n.t()`                 | Translate a leaf key with optional vars              | Sync           | Missing keys use `onMissingKey` or return the key itself             |
| `i18n.tp()`                | Translate a plural branch key                        | Sync           | `count` is injected automatically — do not pass it in `vars`         |
| `i18n.bind()`              | Create a cached, re-usable translation function      | Sync           | Invalidates automatically on locale/catalog change                   |
| `i18n.setLocale()`         | Switch the active locale                             | Async          | Await before rendering; throws if locale is not registered           |
| `i18n.preload()`           | Pre-load a locale catalog without switching          | Async          | Locale must be registered first                                      |
| `i18n.register()`          | Replace a locale's full catalog at runtime           | Sync           | Replaces entirely — use `merge()` to add keys                        |
| `i18n.merge()`             | Overlay additional keys onto a catalog               | Async          | Does not replace; a later `register()` discards merge deltas         |
| `i18n.scope()`             | Return a prefix-bound `{ fmt, t, tp, has }` helper   | Sync           | Returns a new object on every call                                   |
| `i18n.fork()`              | Create an isolated child instance from current state | Sync           | Namespace registry is copied; post-fork registrations are not shared |
| `i18n.getState()`          | Serialise loaded catalogs for SSR hydration          | Sync           | Only includes already-loaded catalogs, not pending loaders           |
| `i18n.restoreState()`      | Hydrate a client instance from server state          | Sync           | Notifies subscribers once after restoring                            |
| `i18n.registerNamespace()` | Register a per-locale namespace source factory       | Sync           | Must be called before `loadNamespace()`                              |
| `i18n.loadNamespace()`     | Load a namespace and merge into the catalog          | Async          | Deduplicates — source is loaded at most once per locale              |
| `createFormatter()`        | Create a standalone Intl formatter                   | Sync           | Pass a getter `() => i18n.locale` to follow locale changes           |
| `validateCatalog()`        | Check a catalog for missing CLDR plural forms        | Sync           | Import from `@vielzeug/lingua/validate` — not for production         |

## Package Entry Points

| Import                      | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `@vielzeug/lingua`          | Main exports and types                             |
| `@vielzeug/lingua/format`   | `createFormatter` and related types                |
| `@vielzeug/lingua/validate` | `validateCatalog` — dev/CI only, exclude from prod |

## createI18n

```ts
createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>
createI18n(options?: I18nOptions<Messages>): I18n<Messages>
```

Creates an i18n instance. All locale strings must be valid BCP 47 tags. Invalid tags throw `[lingua/E004]`.

**Parameters — `I18nOptions<M>`:**

| Option              | Type                                                       | Default         | Description                                                                 |
| ------------------- | ---------------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| `locale`            | `Locale`                                                   | `'en'`          | Active locale at startup. Must be a valid BCP 47 tag.                       |
| `fallback`          | `Locale \| Locale[]`                                       | `undefined`     | Fallback locale chain searched when the active locale is missing a key.     |
| `catalogs`          | `Record<Locale, LocaleSource<M>>`                          | `{}`            | Locale source registry. Values are static objects or async loaders.         |
| `compile`           | `boolean`                                                  | `false`         | Pre-compile templates at registration time for high-frequency render paths. |
| `onMissingKey`      | `(key: string, locale: string) => string`                  | returns `key`   | Called when a translation key is missing.                                   |
| `onMissingVar`      | `(varName: string, key: string, locale: string) => string` | returns `{var}` | Called when an interpolation variable is absent.                            |
| `onSubscriberError` | `(error: unknown) => void`                                 | `console.error` | Called when a `subscribe` callback throws.                                  |

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
  onMissingKey: (key) => `[missing:${key}]`,
  onMissingVar: (varName) => `{${varName}}`,
});
```

## I18n Interface

Every `createI18n` call returns an `I18n<M>` instance.

**Methods:**

| Member                           | Signature                                                                                 | Description                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `t(key, vars?)`                  | `(key: MessageLeafKeys<M> \| string, vars?: TranslateVars) => string`                     | Translate a leaf key with optional variable interpolation.                                               |
| `tp(key, count, options?)`       | `(key: MessageBranchKeys<M> \| string, count: number, options?: TpOptions) => string`     | Translate a plural branch key.                                                                           |
| `bind(key)`                      | `(key: MessageLeafKeys<M> \| string) => (vars?: TranslateVars) => string`                 | Return a cached translation function for hot-path use.                                                   |
| `preload(locale)`                | `(locale: Locale) => Promise<void>`                                                       | Load a catalog without switching the active locale.                                                      |
| `setLocale(locale)`              | `(locale: Locale) => Promise<void>`                                                       | Load if needed, then switch and bump version. On load failure, locale is unchanged (rollback guarantee). |
| `register(locale, source)`       | `(locale: Locale, source: LocaleSource<M>) => void`                                       | Replace the full catalog for a locale. Clears namespace dedup markers.                                   |
| `merge(locale, source)`          | `(locale: Locale, source: LocaleSource<M>) => Promise<void>`                              | Overlay keys onto an existing catalog.                                                                   |
| `scope(prefix)`                  | `(prefix: MessageBranchKeys<M> \| string) => ScopedI18n`                                  | Return a prefix-bound `{ fmt, t, tp, has }` helper.                                                      |
| `fork(overrides?)`               | `(overrides?: Omit<I18nOptions<M>, 'catalogs' \| 'compile'>) => I18n<M>`                  | Create an isolated child instance. Inherits compile mode from parent.                                    |
| `has(key)`                       | `(key: MessageLeafKeys<M> \| string) => boolean`                                          | Check if a leaf key exists in the active fallback chain.                                                 |
| `getSupportedLocales(sorted?)`   | `(sorted?: boolean) => Locale[]`                                                          | Return all registered locales.                                                                           |
| `getSnapshot()`                  | `() => I18nSnapshot`                                                                      | Return the current `{ locale, version }` snapshot.                                                       |
| `getState()`                     | `() => I18nState`                                                                         | Serialise loaded catalogs + active locale for SSR hydration.                                             |
| `restoreState(state)`            | `(state: I18nState) => void`                                                              | Hydrate from serialised state. Notifies subscribers once.                                                |
| `registerNamespace(ns, factory)` | `(ns: string, factory: NamespaceFactory<M>) => void`                                      | Register a per-locale namespace source factory.                                                          |
| `loadNamespace(ns, locale?)`     | `(ns: string, locale?: Locale) => Promise<void>`                                          | Load a namespace for a locale (defaults to active locale).                                               |
| `subscribe(callback, options?)`  | `(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions) => Unsubscribe` | Subscribe to changes. Supports `{ immediate, signal }`. Already-aborted signal skips registration.       |

**Properties:**

| Member   | Type        | Description                                                                                           |
| -------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `locale` | `Locale`    | Readonly. Current active locale string.                                                               |
| `fmt`    | `Formatter` | Lazy-initialised formatter tied to this instance. Invalidates cached `Intl` objects on locale change. |

### `t()`

Resolves a leaf key against the active fallback chain and interpolates variables.

```ts
i18n.t('greeting', { name: 'Alice' }); // => 'Hello, Alice!'
```

Missing keys call `onMissingKey(key, locale)`. Without `onMissingKey`, returns the key string.
Unresolved variables call `onMissingVar(varName, key, locale)`. Without `onMissingVar`, keeps the `{varName}` placeholder.

### `tp()`

Resolves a plural branch key using CLDR rules. For cardinal plurals, `count=0` checks `${key}.zero` before falling back to the CLDR-selected form. Ordinal plurals follow CLDR exclusively.

```ts
i18n.tp('inbox', 0); // => 'No messages'  (from inbox.zero)
i18n.tp('inbox', 1); // => 'One message'
i18n.tp('inbox', 5); // => '5 messages'
i18n.tp('position', 2, { ordinal: true }); // => '2nd'  (ordinal)
i18n.tp('pos', 1, { ordinal: true, vars: { name: 'Alice' } }); // ordinal + extra vars
```

`count` is injected automatically. Do not include `count` in `vars`.

**Pipe-delimited shorthand** — a leaf string containing `|` is expanded into a plural branch at registration time:

```ts
// Equivalent to { inbox: { one: 'One message', other: '{count} messages' } }
const i18n = createI18n({ catalogs: { en: { inbox: 'One message|{count} messages' } } });
```

Supported part counts: `2` (one | other), `3` (zero | one | other), `6` (zero | one | two | few | many | other).
Any other count, or any part that is empty, is treated as a plain string and not expanded.

### `bind()`

```ts
bind(key: MessageLeafKeys<M> | string): (vars?: TranslateVars) => string
```

Returns a translation function bound to a specific key. The returned function caches the catalog lookup and
invalidates automatically on any locale or catalog change (via snapshot comparison). Use it in hot-path
render loops to avoid repeated key-string allocation.

```ts
const greet = i18n.bind('greeting');

// Called many times — lookup cached between calls
users.forEach((u) => greet({ name: u.name }));

// Automatically re-resolves after a locale change
await i18n.setLocale('fr');
greet({ name: 'Alice' }); // => French greeting
```

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
scope(prefix: MessageBranchKeys<M> | string): ScopedI18n
```

Returns a `{ fmt, t, tp, has }` helper where every key is automatically prefixed with `prefix + '.'`.

```ts
const nav = i18n.scope('nav');
nav.t('home'); // equivalent to i18n.t('nav.home')
nav.has('logout'); // equivalent to i18n.has('nav.logout')
nav.tp('items', 3); // equivalent to i18n.tp('nav.items', 3)
```

`scope()` returns a new object on every call — do not compare references across calls.

### `fork()`

```ts
fork(overrides?: Omit<I18nOptions<M>, 'catalogs' | 'compile'>): I18n<M>
```

Creates an isolated child instance from the current catalog snapshot and loader registry. The fork:

- Inherits all resolved catalogs (as static snapshots) and all pending loaders.
- Inherits the namespace registry as it exists at fork time.
- Has its own locale, fallback chain, subscribers, and version counter.
- Catalog and namespace mutations on the fork do not affect the parent, and vice versa.
- Namespace registrations made **after** the fork are not propagated in either direction.

This is the preferred pattern for SSR: fork the shared instance once per request rather than re-creating the full instance and re-registering all catalogs.

```ts
// SSR: one fork per request — clean locale isolation without re-registering catalogs
const reqI18n = i18n.fork({ locale: req.locale });
await reqI18n.setLocale(req.locale);
const html = `<h1>${reqI18n.t('title')}</h1>`;

// Tests: custom missing-key handler without polluting the shared instance
const testI18n = i18n.fork({ onMissingKey: (k) => `MISSING:${k}` });
```

### `subscribe()`

```ts
subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe
```

Registers a callback that runs on locale or catalog changes. Returns an `Unsubscribe` function.
Pass `{ immediate: true }` to call the callback immediately with the current snapshot.
Pass `{ signal }` to unsubscribe automatically when an `AbortSignal` fires. If the signal is already aborted when `subscribe()` is called, no subscription is created and no callback is invoked.

```ts
// Manual unsubscribe
const stop = i18n.subscribe(
  ({ locale }) => {
    document.documentElement.lang = locale;
  },
  { immediate: true },
);

stop(); // unsubscribe

// AbortSignal-based lifecycle management
const controller = new AbortController();
i18n.subscribe(({ locale }) => render(locale), { signal: controller.signal });
// controller.abort() unsubscribes
```

### `getSupportedLocales()`

```ts
getSupportedLocales(sorted?: boolean): Locale[]
```

Returns all registered locales. Without arguments, returns locales in registration order. Pass `true` for Unicode code-point sort order.

```ts
i18n.getSupportedLocales(); // => ['en', 'de', 'fr']  (insertion order)
i18n.getSupportedLocales(true); // => ['de', 'en', 'fr']  (sorted)
```

### `registerNamespace()`

```ts
registerNamespace(ns: string, factory: NamespaceFactory<M>): void
```

Registers a namespace source factory. The factory is called per locale when `loadNamespace()` runs. Namespaces allow lazy-loading partial catalogs (e.g. per-route translations) without polluting the main catalog.

```ts
i18n.registerNamespace('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default));
```

### `loadNamespace()`

```ts
loadNamespace(ns: string, locale?: Locale): Promise<void>
```

Loads the named namespace for `locale` (defaults to the active locale) and merges its keys into the existing catalog. Subsequent calls for the same `ns + locale` pair are no-ops. Throws `[lingua/E005]` if the namespace has not been registered.

```ts
// Load for the active locale
await i18n.loadNamespace('settings');

// Pre-load for a specific locale
await i18n.loadNamespace('settings', 'de');
```

## validateCatalog

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';

validateCatalog(messages: Messages, locale: Locale): ValidationWarning[]
```

Checks a flat or nested message catalog against CLDR plural rules for `locale`. Returns an array of `ValidationWarning` objects for every plural branch that is missing one or more expected forms. Import from the separate `@vielzeug/lingua/validate` entry — do not include it in your production bundle.

Returns an empty array when there are no issues.

**Parameters:**

| Parameter  | Type       | Description                               |
| ---------- | ---------- | ----------------------------------------- |
| `messages` | `Messages` | A locale catalog (nested objects allowed) |
| `locale`   | `Locale`   | The BCP 47 locale to validate against     |

**Returns:** `ValidationWarning[]`

**Example:**

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';

const warnings = validateCatalog(
  {
    inbox: { one: 'One message', other: '{count} messages' },
  },
  'ar',
);

// Arabic requires: zero, one, two, few, many, other
// => [{ key: 'inbox', locale: 'ar', form: 'zero' }, { key: 'inbox', locale: 'ar', form: 'two' }, ...]

if (warnings.length > 0) throw new Error(`Missing plural forms:\n${JSON.stringify(warnings, null, 2)}`);
```

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

| Method                                | Intl primitive            | Description                         |
| ------------------------------------- | ------------------------- | ----------------------------------- |
| `number(value, options?)`             | `Intl.NumberFormat`       | Format a number                     |
| `currency(value, currency, options?)` | `Intl.NumberFormat`       | Format a number as currency         |
| `date(value, options?)`               | `Intl.DateTimeFormat`     | Format a `Date` or timestamp        |
| `relative(value, unit, options?)`     | `Intl.RelativeTimeFormat` | Format a relative time value        |
| `list(value, options?)`               | `Intl.ListFormat`         | Join an array of strings or numbers |
| `duration(value, options?)`           | `Intl.DurationFormat`     | Format a duration object            |
| `clear()`                             | —                         | Evict all cached `Intl` instances   |

## Types

### `I18n<M>`

The object returned by `createI18n`. See the [I18n Interface](#i18n-interface) section for member documentation.

### `I18nOptions<M>`

```ts
type I18nOptions<M extends Messages = Messages> = {
  catalogs?: Record<Locale, LocaleSource<M>>;
  compile?: boolean;
  fallback?: Locale | Locale[];
  locale?: Locale;
  onMissingKey?: (key: string, locale: string) => string;
  onMissingVar?: (varName: string, key: string, locale: string) => string;
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

### `I18nState`

```ts
type I18nState = {
  readonly catalogs: Record<Locale, Record<string, string>>;
  readonly locale: Locale;
};
```

Produced by `i18n.getState()` and consumed by `i18n.restoreState()`. Catalogs are stored as flat dot-notation maps.

### `NamespaceFactory<M>`

```ts
type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => LocaleSource<M> | Promise<M>;
```

Factory passed to `registerNamespace()`. May return a static catalog, a loader `() => Promise<M>`, or a `Promise<M>` directly (async factory pattern).

### `TpOptions`

```ts
type TpOptions = {
  ordinal?: boolean;
  vars?: TranslateVars;
};
```

Options for `tp()`. Pass `{ ordinal: true }` for ordinal plural forms (1st, 2nd, 3rd). Pass `vars` to inject additional interpolation variables alongside the automatically injected `count`.

### `SubscribeOptions`

```ts
type SubscribeOptions = {
  immediate?: boolean;
  signal?: AbortSignal;
};
```

### `ValidationWarning`

```ts
type ValidationWarning = {
  form: string; // the missing CLDR plural form (e.g. 'few', 'many')
  key: string; // dot-notation path to the plural branch
  locale: Locale; // the locale being validated
};
```

Returned by [`validateCatalog()`](#validatecatalog).

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
  readonly fmt: Formatter;
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, options?: TpOptions): string;
};
```

Returned by `i18n.scope(prefix)`. The `fmt` property is the same formatter instance as `i18n.fmt`.

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

Recursively infers all dot-separated paths to `string` leaf values in a `Messages` type. Constrains the `key` parameter of `t()`, `has()`, and `bind()`. Recursion is capped at depth 4.

```ts
type MessageLeafKeys<T, P extends string = '', D extends number = 4> = /* recursive conditional type */
```

### `MessageBranchKeys<T>`

Recursively infers all dot-separated paths to non-string (branch) values in a `Messages` type. Constrains the `key` parameter of `tp()` and `scope()`. Recursion is capped at depth 4.

```ts
type MessageBranchKeys<T, P extends string = '', D extends number = 4> = /* recursive conditional type */
```

### `Formatter`

```ts
type Formatter = {
  clear(): void;
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  duration(value: DurationValue, options?: DurationFormatOptions): string;
  list(value: Array<string | number>, options?: ListFormatOptions): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
};
```

### `DurationValue`

```ts
type DurationValue = Partial<
  Record<
    | 'days'
    | 'hours'
    | 'microseconds'
    | 'milliseconds'
    | 'minutes'
    | 'months'
    | 'nanoseconds'
    | 'seconds'
    | 'weeks'
    | 'years',
    number
  >
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

## Errors

| Error code      | When thrown                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `[lingua/E001]` | `setLocale()` or `preload()` is called with a locale that has no registered source.                        |
| `[lingua/E002]` | `tp()` receives a non-finite `count`.                                                                      |
| `[lingua/E003]` | `tp()` receives `options.vars.count` (injected automatically).                                             |
| `[lingua/E004]` | Any API receives a string that is not a valid BCP 47 tag (`createI18n`, `setLocale`, `register`, `merge`). |
| `[lingua/E005]` | `loadNamespace()` is called for a namespace that has not been registered.                                  |
