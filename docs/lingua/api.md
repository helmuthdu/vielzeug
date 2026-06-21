---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol                   | Purpose                                                                            | Execution mode | Common gotcha                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `createI18n()`           | Create an i18n instance with locale catalogs                                       | Sync           | Catalogs are lazy; call `preload()` before SSR render                                                              |
| `i18n.t()`               | Translate a leaf key with optional vars                                            | Sync           | Missing keys use `onMissingKey` or return the key itself                                                           |
| `i18n.tp()`              | Translate a plural branch key                                                      | Sync           | `count` is injected automatically — do not pass it in `vars`                                                       |
| `i18n.extend()`          | Register and immediately load a namespace                                          | Async          | Deduplicates per `ns + locale`; new factory updates registry but does not reload; throws synchronously if disposed |
| `i18n.setLocale()`       | Switch the active locale                                                           | Async          | Await before rendering; throws if locale is not registered                                                         |
| `i18n.preload()`         | Pre-load a locale catalog without switching                                        | Async          | Locale must be registered first                                                                                    |
| `i18n.register()`              | Register or replace a locale source; loads it immediately                          | Async          | Returns `Promise<void>`; awaiting ensures the catalog is ready before rendering                                    |
| `i18n.scope()`           | Return a prefix-bound `{ fmt, t, tp, has }` helper                                 | Sync           | Memoized per prefix — same object returned for same prefix string                                                  |
| `i18n.fork()`            | Create an isolated child instance from current state                               | Sync           | Catalog snapshot is copied; post-fork extend() calls are independent                                               |
| `i18n.has()`             | Check if a leaf or branch key exists in the active chain                           | Sync           | Returns `true` for branch keys and pipe-plural base keys                                                           |
| `i18n.isLoaded()`        | Check if a locale catalog is fully resolved                                        | Sync           | Returns `false` for async loaders not yet preloaded; safe predicate                                                |
| `i18n.isRegistered()`    | Check if a locale is in the known registry                                         | Sync           | `true` for both resolved catalogs and pending loaders; never throws                                                |
| `i18n.disposalSignal`    | `AbortSignal` aborted on disposal                                                  | Sync getter    | Tie external lifetimes (SSE, polling) to this i18n instance                                                        |
| `i18n.dispose()`         | Release all subscribers and catalog state                                          | Sync           | After disposal, `t()` falls back to `onMissingKey` for every key                                                   |
| `i18n.disposed`          | `true` after `dispose()` is called                                                 | Sync getter    | —                                                                                                                  |
| `i18n[Symbol.dispose]()` | Delegates to `dispose()`                                                           | Sync           | Enables `using` declarations                                                                                       |
| `i18n.registerNamespace()` | Register a namespace factory without loading                                       | Sync           | Call `loadNamespace()` when ready to load, or use `extend()` for register+load in one call                         |
| `i18n.loadNamespace()`    | Load a registered namespace for a locale                                           | Async          | Deduplicates concurrent and repeated calls; throws if namespace not registered                                      |
| `i18n.isNamespaceLoaded()`  | Check if a namespace is loaded for the active (or given) locale                  | Sync           | Returns `false` if not registered or not yet loaded for this locale                                                |
| `i18n.isNamespaceRegistered()` | Check if a namespace factory has been registered                              | Sync           | `true` after `registerNamespace()` or `extend()`; `false` before                                                   |
| `i18n.getState()`         | Extract a serializable snapshot of loaded catalogs + active locale                 | Sync           | Equivalent to `serializeI18n(i18n)` — preferred for public API access                                              |
| `i18n.restoreState()`     | Hydrate instance from serialized state                                             | Sync           | Equivalent to `hydrateI18n(state, i18n)` — preferred for public API access; throws `[lingua/E006]` if locale missing |
| `serializeI18n()`         | Serialise loaded catalogs for SSR hydration                                        | Sync           | Loader-only locales are omitted — check `isLoaded()` before calling                                                |
| `hydrateI18n()`           | Hydrate a client instance from server-serialised state                             | Sync           | Throws `[lingua/E006]` if `state.locale` has no catalog                                                            |
| `LinguaError` / `E`       | Typed error class and error-code constants                                         | —              | All runtime errors are `instanceof LinguaError`; use `E.*` for stable codes                                        |
| `createFormatter()`       | Create a standalone Intl formatter                                                 | Sync           | Exported from main entry — pass a getter `() => i18n.locale` to follow locale changes                              |
| `validateCatalog()`       | Check a catalog for missing CLDR plural forms and missing `{count}` interpolations | Sync           | Import from `@vielzeug/lingua/validate` — not for production                                                       |

## Package Entry Points

| Import                      | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `@vielzeug/lingua`          | Main exports and types, includes `createFormatter`         |
| `@vielzeug/lingua/validate` | `validateCatalog` — dev/CI only, exclude from prod         |

## createI18n

```ts
createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>
createI18n(options?: I18nOptions<Messages>): I18n<Messages>
```

Creates an i18n instance. All locale strings must be valid BCP 47 tags. Invalid tags throw `[lingua/E004]`.

**Parameters — `I18nOptions<M>`:**

| Option              | Type                                                       | Default         | Description                                                             |
| ------------------- | ---------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `locale`            | `Locale`                                                   | `'en'`          | Active locale at startup. Must be a valid BCP 47 tag.                   |
| `fallback`          | `Locale \| Locale[]`                                       | `undefined`     | Fallback locale chain searched when the active locale is missing a key. |
| `catalogs`          | `Record<Locale, LocaleSource<M>>`                          | `{}`            | Locale source registry. Values are static objects or async loaders.     |
| `onMissingKey`      | `(key: string, locale: string) => string`                  | returns `key`   | Called when a translation key is missing.                               |
| `onMissingVar`      | `(varName: string, key: string, locale: string) => string` | returns `{var}` | Called when an interpolation variable is absent.                        |
| `onSubscriberError` | `(error: unknown) => void`                                 | `console.error` | Called when a `subscribe` callback throws.                              |

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

| Member                          | Signature                                                                                 | Description                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `t(key, vars?)`                 | `(key: MessageLeafKeys<M> \| string, vars?: TranslateVars) => string`                     | Translate a leaf key with optional variable interpolation.                                                                     |
| `tp(key, count, options?)`      | `(key: MessageBranchKeys<M> \| string, count: number, options?: TpOptions) => string`     | Translate a plural branch key.                                                                                                 |
| `extend(ns, factory, locale?)`  | `(ns: string, factory: NamespaceFactory<M>, locale?: Locale) => Promise<void>`            | Register a namespace factory and immediately load it for `locale` (defaults to active locale). Deduplicates per `ns + locale`. |
| `preload(locale)`               | `(locale: Locale) => Promise<void>`                                                       | Load a catalog without switching the active locale.                                                                            |
| `setLocale(locale)`             | `(locale: Locale) => Promise<void>`                                                       | Load if needed, then switch and notify subscribers. On load failure, locale is unchanged.                                      |
| `register(locale, source)`      | `(locale: Locale, source: LocaleSource<M>) => Promise<void>`                              | Register or replace a locale source. Returns a Promise that resolves when loading is complete. Async loaders start immediately. |
| `registerNamespace(ns, factory)` | `(ns: string, factory: NamespaceFactory<M>) => void`                                    | Register a namespace factory without loading. Use `loadNamespace()` to trigger, or `extend()` to do both.                     |
| `loadNamespace(ns, locale?)`    | `(ns: string, locale?: Locale) => Promise<void>`                                          | Load a registered namespace for `locale` (defaults to active locale). Deduplicates concurrent and repeated calls.             |
| `scope(prefix)`                 | `(prefix: MessageBranchKeys<M> \| string) => ScopedI18n`                                  | Return a prefix-bound `{ fmt, t, tp, has }` helper. Memoized per prefix — same object reference for the same prefix string.    |
| `fork(overrides?)`              | `(overrides?: Omit<I18nOptions<M>, 'catalogs'>) => I18n<M>`                               | Create an isolated child instance from the current catalog snapshot.                                                           |
| `getState()`                    | `() => I18nState`                                                                         | Extract a serializable snapshot of loaded catalogs and the active locale.                                                      |
| `restoreState(state)`           | `(state: I18nState) => void`                                                              | Hydrate this instance from serialized state. Clears namespace markers. Notifies subscribers.                                   |
| `has(key)`                      | `(key: MessageLeafKeys<M> \| MessageBranchKeys<M> \| string) => boolean`                  | Check if a leaf or branch key exists in the active fallback chain.                                                             |
| `isLoaded(locale)`              | `(locale: Locale) => boolean`                                                             | Return `true` if the catalog for `locale` is fully resolved. Never throws.                                                     |
| `isRegistered(locale)`          | `(locale: Locale) => boolean`                                                             | Return `true` if `locale` is in the known registry (resolved **or** pending loader). Never throws.                             |
| `isNamespaceLoaded(ns, locale?)` | `(ns: string, locale?: Locale) => boolean`                                               | Return `true` if the namespace is loaded for `locale` (defaults to active locale). Never throws.                               |
| `isNamespaceRegistered(ns)`     | `(ns: string) => boolean`                                                                 | Return `true` if a namespace factory is registered under `ns`. Never throws.                                                   |
| `disposalSignal`                | `AbortSignal`                                                                             | Aborted when `dispose()` is called.                                                                                            |
| `dispose()`                     | `() => void`                                                                              | Release all subscribers, catalogs, loaders, and namespace state. Idempotent.                                                   |
| `disposed`                      | `boolean`                                                                                 | `true` after `dispose()` has been called.                                                                                      |
| `[Symbol.dispose]()`            | `() => void`                                                                              | Delegates to `dispose()`. Enables `using` declarations.                                                                        |
| `getSupportedLocales(sorted?)`  | `(sorted?: boolean) => Locale[]`                                                          | Return all registered locales.                                                                                                 |
| `getSnapshot()`                 | `() => I18nSnapshot`                                                                      | Return the current `{ locale, t, tp }` snapshot. Object identity changes on each observable change.                           |
| `subscribe(callback, options?)` | `(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions) => Unsubscribe` | Subscribe to changes. Supports `{ immediate, signal }`. Already-aborted signal skips registration.                             |

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

### `extend()`

```ts
extend(ns: string, factory: NamespaceFactory<M>, locale?: Locale): Promise<void>
```

Registers a namespace factory and immediately loads it for `locale` (defaults to the active locale). The factory receives the target locale string and must return `Promise<M>`. Concurrent and repeated calls for the same `ns + locale` pair are deduplicated — the factory runs at most once per locale.

> **Note:** Calling `extend()` with a **new factory** after the namespace is already loaded updates the registry for future reloads (e.g. after `register()` replaces the catalog) but does **not** reload the namespace immediately. The new factory takes effect the next time the namespace marker is cleared.

```ts
// Load settings keys when entering the settings route
await i18n.extend('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default));

// Pre-load for a specific locale
await i18n.extend('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default), 'de');
```

Throws `LinguaError(E.DISPOSED)` synchronously if called on a disposed instance.

### `registerNamespace()`

```ts
registerNamespace(ns: string, factory: NamespaceFactory<M>): void
```

Registers a namespace factory without loading it. Use `loadNamespace()` to trigger loading when needed, or use `extend()` to register and load in one call.

Re-registering a namespace updates the factory for future loads but does **not** reload if the namespace is already loaded. The new factory takes effect the next time the namespace marker is cleared (by a `register()` or `restoreState()` call).

Throws `LinguaError(E.DISPOSED)` if called on a disposed instance.

### `loadNamespace()`

```ts
loadNamespace(ns: string, locale?: Locale): Promise<void>
```

Loads a registered namespace for `locale` (defaults to the active locale). Concurrent and repeated calls for the same `ns + locale` pair are deduplicated — the factory runs at most once per locale.

Throws if the namespace has not been registered with `registerNamespace()` first.
Throws `LinguaError(E.DISPOSED)` if called on a disposed instance.

```ts
i18n.registerNamespace('settings', (locale) =>
  import(`./locales/${locale}/settings.json`).then((m) => m.default),
);

// Load on demand (e.g. when the settings route is activated)
await i18n.loadNamespace('settings');
```

### `isNamespaceLoaded()`

```ts
isNamespaceLoaded(ns: string, locale?: Locale): boolean
```

Returns `true` if the namespace `ns` has been fully loaded for `locale` (defaults to active locale). Returns `false` if not registered, not yet loaded for this locale, or if the instance is disposed. Never throws.

### `isNamespaceRegistered()`

```ts
isNamespaceRegistered(ns: string): boolean
```

Returns `true` if a namespace factory has been registered under `ns` via `registerNamespace()` or `extend()`. Returns `false` otherwise. Never throws.

### `getState()`

```ts
getState(): I18nState
```

Extracts a serializable snapshot of all **fully loaded** catalogs and the active locale. Equivalent to `serializeI18n(i18n)` but preferred because it is called directly on the instance without requiring an import.

**Warning:** Only fully resolved catalogs are included. Loader-only locales not yet preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.

```ts
const state = i18n.getState();
// JSON.stringify(state) and send to client
```

### `restoreState()`

```ts
restoreState(state: I18nState): void
```

Hydrates this instance from an `I18nState` produced by `getState()` or `serializeI18n()`. Equivalent to `hydrateI18n(state, i18n)` but preferred because it is called directly on the instance.

- Replaces all catalogs with those from `state`.
- Sets the active locale to `state.locale`.
- Clears all namespace loaded-markers so that `extend()` / `loadNamespace()` can re-apply namespaces.
- Notifies subscribers.

Throws `LinguaError(E.RESTORE_NO_LOCALE)` if `state.locale` has no catalog in `state.catalogs`.
Throws `LinguaError(E.DISPOSED)` if called on a disposed instance.

```ts
// Client — restore server-rendered state
const i18n = createI18n();

i18n.restoreState(window.__I18N_STATE__);
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

`scope()` is memoized per prefix — repeated calls with the same prefix string return the same object reference. The cached object is invalidated when `dispose()` is called.

### `fork()`

```ts
fork(overrides?: Omit<I18nOptions<M>, 'catalogs'>): I18n<M>
```

Creates an isolated child instance from the current catalog snapshot and loader registry. The fork:

- Inherits all resolved catalogs (as static snapshots) and all pending loaders.
- Inherits the namespace registry and loaded-namespace markers as they exist at fork time.
- Has its own locale, fallback chain, and subscribers.
- Catalog and namespace mutations on the fork do not affect the parent, and vice versa.
- Namespace registrations made **after** the fork are not propagated in either direction.
- **Loaded-namespace markers are copied.** If the parent has already loaded a namespace, calling `extend()` on the fork for the same `ns + locale` pair is a no-op. This avoids redundant refetches in SSR fork-per-request patterns.

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

> **Note:** When `{ immediate: true }` is used and the callback throws synchronously on the first invocation, `onSubscriberError` is called and **the subscription is not registered** — the callback will not fire on future changes. This prevents a broken callback from being repeatedly invoked.

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

### `has()`

```ts
has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | string): boolean
```

Returns `true` if a leaf or branch key exists in the active fallback chain. Checks all locales in the chain in order.

- **Leaf keys**: returns `true` if the key maps to a string value.
- **Branch keys**: returns `true` if the key maps to a nested object (e.g. a plural branch).
- **Pipe-plural base keys**: the base key is expanded at registration time into sub-keys (`inbox.one`, `inbox.other`); `has('inbox')` returns `true` because the branch exists.

```ts
// catalog: { inbox: 'One message|{count} messages' }  (pipe-plural → inbox.one, inbox.other)
i18n.has('inbox'); // true  — branch exists
i18n.has('inbox.one'); // true  — explicit sub-key
i18n.has('missing'); // false
```

### `isLoaded()`

```ts
isLoaded(locale: Locale): boolean
```

Returns `true` if the catalog for `locale` is fully resolved (i.e. not a pending async loader). Returns `false` for unregistered locales, pending loaders, and invalid locale tags — never throws.

Primary use case: guarding `serializeI18n()` in SSR to avoid silently omitting locales that were registered as async loaders but never preloaded.

```ts
// SSR guard — ensure all locales are loaded before serialising
const locales = i18n.getSupportedLocales();
await Promise.all(locales.filter((l) => !i18n.isLoaded(l)).map((l) => i18n.preload(l)));
const state = serializeI18n(i18n); // now includes all locales
```

### `isRegistered()`

```ts
isRegistered(locale: Locale): boolean
```

Returns `true` if `locale` is in the known locale registry — either as a resolved catalog or as a pending async loader. Returns `false` for locales that have never been registered, and for invalid locale tags (never throws).

Use `isRegistered` + `isLoaded` together to distinguish the three states:

| Condition                               | `isRegistered` | `isLoaded` |
| --------------------------------------- | -------------- | ---------- |
| Locale never configured                 | `false`        | `false`    |
| Async loader registered, not yet called | `true`         | `false`    |
| Catalog fully resolved                  | `true`         | `true`     |

```ts
if (!i18n.isRegistered('fr')) throw new Error('fr locale not configured');
if (!i18n.isLoaded('fr')) await i18n.preload('fr');
const state = serializeI18n(i18n); // 'fr' guaranteed to be present
```

### `disposalSignal`

```ts
get disposalSignal(): AbortSignal
```

`AbortSignal` aborted when `dispose()` is called. Use to tie external resource lifetimes (SSE streams, polling intervals, child `I18n` instances) to this i18n instance.

```ts
startPolling({ signal: routeI18n.disposalSignal });
// polling stops automatically when routeI18n.dispose() is called
```

---

### `disposed`

```ts
get disposed(): boolean
```

`true` after `dispose()` has been called.

---

### `[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Delegates to `dispose()`. Enables the `using` declaration:

```ts
{
  using i18n = createI18n({ catalogs: { en: messages } });
  // dispose() called automatically at block exit
}
```

---

### `dispose()`

```ts
dispose(): void
```

Releases all subscribers, catalogs, loaders, and namespace state. Calling `dispose()` more than once is safe (idempotent).

After disposal:

- `t()` / `tp()` fall back to `onMissingKey` for every key (returning the key string by default).
- `isLoaded()` and `isRegistered()` return `false` for all locales.
- No subscribers are notified of further changes.
- `setLocale()` and `preload()` reject with `[lingua/E007]`.
- `register()` throws `[lingua/E007]`.
- `subscribe()` throws `[lingua/E007]`.
- `extend()` throws `[lingua/E007]`.

Primarily useful for long-lived SPA instances that are replaced at runtime (e.g. route-level i18n) to prevent subscriber and catalog memory from accumulating.

```ts
// Clean up a route-level i18n instance when the route is destroyed
const routeI18n = i18n.fork({ locale: 'de' });

onRouteDestroy(() => routeI18n.dispose());
```

## validateCatalog

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';

validateCatalog(messages: Messages, locale: Locale): ValidationWarning[]
```

Checks a flat or nested message catalog against CLDR plural rules for `locale`. Returns an array of `ValidationWarning` objects for every plural branch that is missing one or more expected forms. Import from the separate `@vielzeug/lingua/validate` entry — do not include it in your production bundle.

Returns an empty array when there are no issues.

**Note:** A branch is treated as a plural branch when any of its child keys is a CLDR form (`zero`, `one`, `two`, `few`, `many`, `other`). A mixed-use branch (e.g. `{ count: 'x', one: 'y' }`) will also be flagged and may produce spurious warnings for non-CLDR sibling keys.

`validateCatalog` also checks for a common authoring error: a form template for `other`, `two`, `few`, or `many` that does not contain `{count}`. Since `tp()` injects `count` automatically, omitting it from a non-singleton form is almost always a mistake. These warnings use `form: '<form>:missing-count'` (e.g. `'other:missing-count'`). The `zero` and `one` forms are exempt — intentionally omitting `{count}` is normal there (e.g. `'No messages'`, `'One message'`).

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
import { createFormatter } from '@vielzeug/lingua';

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
import { createFormatter } from '@vielzeug/lingua';

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

| Method                                | Intl primitive            | Description                                                                                               |
| ------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `number(value, options?)`             | `Intl.NumberFormat`       | Format a number                                                                                           |
| `currency(value, currency, options?)` | `Intl.NumberFormat`       | Format a number as currency                                                                               |
| `date(value, options?)`               | `Intl.DateTimeFormat`     | Format a `Date` or timestamp                                                                              |
| `relative(value, unit, options?)`     | `Intl.RelativeTimeFormat` | Format a relative time value                                                                              |
| `list(value, options?)`               | `Intl.ListFormat`         | Join an array of strings or numbers                                                                       |
| `duration(value, options?)`           | `Intl.DurationFormat`     | Format a duration object. **Fallback labels are English-only** when `Intl.DurationFormat` is unavailable. |
| `clear()`                             | —                         | Evict all cached `Intl` instances                                                                         |

Each `Intl` instance is cached by a locale + options key. The cache per method is capped at 128 entries (LRU eviction), so memory is bounded even in SSR workloads that create many distinct option combinations.

## Types

### `I18n<M>`

The object returned by `createI18n`. See the [I18n Interface](#i18n-interface) section for member documentation.

### `I18nOptions<M>`

```ts
type I18nOptions<M extends Messages = Messages> = {
  catalogs?: Record<Locale, LocaleSource<M>>;
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
  readonly t: (key: string, vars?: TranslateVars) => string;
  readonly tp: (key: string, count: number, options?: TpOptions) => string;
};
```

Object identity changes on every observable change — use as a change-detection sentinel. The `t` and `tp` accessors are bound to the same translation functions as the instance, making the snapshot a self-contained translation unit suitable for passing to framework components.

### `I18nState`

```ts
type I18nState = {
  readonly catalogs: Record<Locale, Record<string, string>>;
  readonly locale: Locale;
};
```

Produced by `getState()` / `serializeI18n()` and consumed by `restoreState()` / `hydrateI18n()`. Catalogs are stored as flat dot-notation maps.

### `NamespaceFactory<M>`

```ts
type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => Promise<M>;
```

Factory passed to `registerNamespace()` / `extend()`. Receives the target locale and must return a `Promise<M>` with the namespace messages for that locale.

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
import type { ValidationWarning } from '@vielzeug/lingua/validate';

type ValidationWarning = {
  form: string; // missing CLDR plural form (e.g. 'few', 'many') or '<form>:missing-count' for {count} warnings
  key: string; // dot-notation path to the plural branch
  locale: Locale; // the locale being validated
};
```

Returned by [`validateCatalog()`](#validatecatalog). Import from `@vielzeug/lingua/validate` — not re-exported from the main entry point. The `form` field uses plain CLDR form names (e.g. `'other'`) for missing-form warnings, and `'<form>:missing-count'` (e.g. `'other:missing-count'`) for templates that are missing `{count}` interpolation.

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

Recursively infers all dot-separated paths to `string` leaf values in a `Messages` type. Constrains the `key` parameter of `t()` and `has()`. Recursion is capped at depth 7.

```ts
type MessageLeafKeys<T, P extends string = '', D extends number = 7> = /* recursive conditional type */
```

### `MessageBranchKeys<T>`

Recursively infers all dot-separated paths to non-string (branch) values in a `Messages` type. Constrains the `key` parameter of `tp()` and `scope()`. Recursion is capped at depth 7.

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

## serializeI18n

```ts
import { serializeI18n } from '@vielzeug/lingua';

serializeI18n(i18n: I18n): I18nState
```

Serialises the current loaded catalogs and active locale into an `I18nState` object. Use this on the server before embedding state in the HTML response. Loader-only locales that have not been preloaded are silently omitted — call `isLoaded()` to verify all locales are resolved before calling `serializeI18n()`.

```ts
// Server
const i18n = createI18n({ catalogs: { de: deMessages, en: enMessages }, locale: 'de' });
const state = serializeI18n(i18n);
// Embed in the HTML response:
// <script>window.__I18N__ = ${JSON.stringify(state)}</script>
```

## hydrateI18n

```ts
import { hydrateI18n } from '@vielzeug/lingua';

hydrateI18n(i18n: I18n, state: I18nState): void
```

Hydrates a client-side instance from server-serialised state. Replaces all catalogs and switches the active locale. Notifies subscribers once after hydration.

Throws `LinguaError(E.RESTORE_NO_LOCALE)` if `state.locale` has no corresponding entry in `state.catalogs`.

```ts
// Client
const i18n = createI18n();
hydrateI18n(i18n, window.__I18N__);
// Catalogs from state are immediately available; no network request needed.
```

**Parameters:**

| Parameter | Type        | Description                                |
| --------- | ----------- | ------------------------------------------ |
| `i18n`    | `I18n`      | The instance to hydrate.                   |
| `state`   | `I18nState` | State object produced by `serializeI18n()` |

## LinguaError

```ts
import { E, LinguaError } from '@vielzeug/lingua';
```

All errors thrown by the `@vielzeug/lingua` runtime are instances of `LinguaError`. Use `instanceof LinguaError` to distinguish them from generic errors, and `.code` to branch on a specific error without fragile string matching.

```ts
try {
  await i18n.setLocale('de');
} catch (err) {
  if (err instanceof LinguaError && err.code === E.MISSING_LOCALE) {
    // locale not registered — handle gracefully
  } else {
    throw err;
  }
}
```

**`LinguaError` properties:**

| Property  | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `code`    | `string` | Stable error code constant from `E`       |
| `message` | `string` | Human-readable message including the code |
| `name`    | `string` | Always `"LinguaError"`                    |

**`E` constants:**

| Constant              | Value           | When thrown                                                   |
| --------------------- | --------------- | ------------------------------------------------------------- |
| `E.MISSING_LOCALE`    | `'lingua/E001'` | `preload()` / `setLocale()` — locale has no registered source |
| `E.INVALID_COUNT`     | `'lingua/E002'` | `tp()` — `count` is non-finite                                |
| `E.COUNT_IN_VARS`     | `'lingua/E003'` | `tp()` — `vars.count` was passed explicitly                   |
| `E.INVALID_LOCALE`    | `'lingua/E004'` | Any API receiving an invalid BCP 47 tag                       |
| `E.NAMESPACE_MISSING` | `'lingua/E005'` | Reserved internal guard — not thrown under normal usage       |
| `E.RESTORE_NO_LOCALE` | `'lingua/E006'` | `hydrateI18n()` — `state.locale` absent from `state.catalogs` |
| `E.DISPOSED`          | `'lingua/E007'` | Any mutating API called on a disposed instance                |

## Errors

| Error code      | When thrown                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[lingua/E001]` | `preload()` is called with a locale that has no registered source (also thrown by `setLocale()` when the locale is unregistered and the instance is not disposed — a disposed instance throws `E007` first). |
| `[lingua/E002]` | `tp()` receives a non-finite `count`.                                                                                                                                                                        |
| `[lingua/E003]` | `tp()` receives `options.vars.count` (injected automatically).                                                                                                                                               |
| `[lingua/E004]` | Any API receives a string that is not a valid BCP 47 tag (`createI18n`, `setLocale`, `register`).                                                                                                            |
| `[lingua/E005]` | Reserved internal guard — not thrown under normal usage. Reserved for future defensive checks.                                                                                                               |
| `[lingua/E006]` | `hydrateI18n()` is called with a `state.locale` that has no corresponding entry in `state.catalogs`.                                                                                                         |
| `[lingua/E007]` | Mutating API (`setLocale()`, `preload()`, `register()`, `subscribe()`, `extend()`) called on a disposed instance.                                                                                            |

> All errors are `instanceof LinguaError` and carry a `.code` property matching the `E` constants. See [`LinguaError`](#linguaerror).
