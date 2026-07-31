---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol                   | Purpose                                                                            | Execution mode | Common gotcha                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `createI18n()`           | Create an i18n instance with locale catalogs                                       | Sync           | Catalogs are lazy; call `preload()` before SSR render                                                              |
| `createTranslator()`       | Minimal static single-locale translator (`t`/`ti`/`tp`/`tpi`)                      | Sync           | Catalog compiled at creation; later edits are invisible — see `createI18n` for multi-locale                          |
| `i18n.t()`               | Translate a leaf key with optional vars                                            | Sync           | Missing keys use `onMissingKey` or return the key itself                                                           |
| `i18n.tp()`              | Translate a plural branch key                                                      | Sync           | `count` is injected automatically — do not pass it in `vars`                                                       |
| `i18n.ti()`              | Segmented interpolation — mixed `Array<string \| V>` for embedding components      | Sync           | Missing key falls back through `onMissingKey`; missing var keeps its `{placeholder}` segment                        |
| `i18n.tpi()`             | Segmented plural interpolation — `ti()` semantics on a plural branch                | Sync           | `count` injected as a raw-number segment; missing branch falls back through `onMissingKey`                          |
| `i18n.loadNamespace()`   | Register (optional) and load a namespace                                            | Async          | Deduplicates per `ns + locale`; new factory updates registry but does not reload; throws synchronously if disposed |
| `i18n.setLocale()`       | Switch the active locale                                                           | Async          | Await before rendering; throws if locale is not registered                                                         |
| `i18n.preload()`         | Pre-load a locale catalog without switching                                        | Async          | Locale must be registered first                                                                                    |
| `i18n.register()`              | Register or replace a locale source; loads it immediately                          | Async          | Returns `Promise<void>`; awaiting ensures the catalog is ready before rendering                                    |
| `i18n.scope()`           | Return a prefix-bound `{ fmt, t, ti, tp, tpi, has }` helper                        | Sync           | Memoized per prefix — same object returned for same prefix string                                                  |
| `i18n.fork()`            | Create an isolated child instance from current state                               | Sync           | Catalog snapshot is copied; post-fork loadNamespace() calls are independent                                        |
| `i18n.has()`             | Check if a key exists in the active chain                                          | Sync           | Leaf-only by default; pass `{ kind: 'branch' }` for branch keys                                                    |
| `i18n.isLoaded()`        | Check if a locale catalog is fully resolved                                        | Sync           | Returns `false` for async loaders not yet preloaded; throws on invalid BCP 47 tag                                  |
| `i18n.disposalSignal`    | `AbortSignal` aborted on disposal                                                  | Sync getter    | Tie external lifetimes (SSE, polling) to this i18n instance                                                        |
| `i18n.dispose()`         | Release all subscribers and catalog state                                          | Sync           | After disposal, `t()` falls back to `onMissingKey` for every key                                                   |
| `i18n.disposed`          | `true` after `dispose()` is called                                                 | Sync getter    | —                                                                                                                  |
| `i18n[Symbol.dispose]()` | Delegates to `dispose()`                                                           | Sync           | Enables `using` declarations                                                                                       |
| `i18n.registerNamespace()` | Register a namespace factory without loading                                       | Sync           | Call `loadNamespace()` when ready, or pass the factory to `loadNamespace()` to do both in one call                 |
| `i18n.isNamespaceLoaded()`  | Check if a namespace is loaded for the active (or given) locale                  | Sync           | Returns `false` if not registered or not yet loaded for this locale                                                |
| `i18n.getState()`         | Extract a serializable snapshot of loaded catalogs + active locale                 | Sync           | Loader-only locales are omitted — check `isLoaded()` before calling                                                |
| `i18n.restoreState()`     | Hydrate instance from serialized state                                             | Sync           | Throws `LinguaRestoreError` if `state.locale` has no catalog                                                       |
| Error classes             | Named error subclasses (`LinguaDisposedError`, `LinguaMissingLocaleError`, …)      | —              | All runtime errors are `instanceof LinguaError`; use `instanceof` for specific handling                            |
| `createFormatter()`       | Create a standalone Intl formatter                                                 | Sync           | Available from the main entry or `@vielzeug/lingua/format` — pass a getter `() => i18n.locale` to follow locale changes |
| `validateCatalog()`       | Check a catalog for missing CLDR plural forms and missing `{count}` interpolations | Sync           | Import from `@vielzeug/lingua/validate` for CI enforcement — `createI18n()` already runs the same check automatically in dev builds |

## Package Entry Points

| Import                      | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `@vielzeug/lingua`          | Main exports and types, includes `createFormatter`         |
| `@vielzeug/lingua/format`   | Standalone `createFormatter` — no `createI18n` dependency  |
| `@vielzeug/lingua/validate` | `validateCatalog` — dev/CI only, exclude from prod         |

## createTranslator

```ts
createTranslator<T extends Messages>(catalog: T, options?: CreateTranslatorOptions): Translator<T>
```

Creates a minimal static, single-locale translator — resolution, interpolation, and plurals on a plain catalog object. Designed to be called once at module level alongside a component's `translations` object: no subscriptions, no async loaders, no namespace registry, no disposal. The catalog is compiled at creation; later edits to the source object are invisible.

Multi-locale consumers should use `createI18n()` instead — `createTranslator` is deliberately single-locale.

**Parameters — `CreateTranslatorOptions`:**

| Option         | Type                                                       | Default         | Description                                                  |
| -------------- | ---------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| `locale`       | `Locale`                                                   | `'en'`          | Drives CLDR plural selection for `tp()`. Valid BCP 47 tag.   |
| `onMissingKey` | `(key: string, locale: string) => string`                  | returns `key`   | Called when a translation key is missing.                    |
| `onMissingVar` | `(varName: string, key: string, locale: string) => string` | returns `{var}` | Called when an interpolation variable is absent.             |

```ts
const { t, ti, tp } = createTranslator(
  {
    cancel: 'Cancel',
    error: 'Try to {reloadLink} or {supportLink} for help.',
    inbox: { one: 'One message', other: '{count} messages' },
    save: 'Save',
  },
  { locale: 'en' },
);

t('save');                                 // 'Save'
tp('inbox', 5);                            // '5 messages'
ti('error', { reloadLink: <a href="/r">reload</a>, supportLink: <a href="/s">support</a> });
// ['Try to ', <a>reload</a>, ' or ', <a>support</a>, ' for help.']
```

### `Translator<T>`

```ts
type Translator<T extends Messages> = {
  t(key: MessageLeafKeys<T>, vars?: TranslateVars): string;
  ti<V>(key: MessageLeafKeys<T>, vars: Record<string, V>): Array<string | V>;
  tp(key: MessageBranchKeys<T>, count: number, options?: TpOptions): string;
  tpi<V>(key: MessageBranchKeys<T>, count: number, options?: TpiOptions<V>): Array<string | number | V>;
};
```

## createI18n

```ts
createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>
createI18n(options?: I18nOptions<Messages>): I18n<Messages>
```

Creates an i18n instance. All locale strings must be valid BCP 47 tags. Invalid tags throw `LinguaInvalidLocaleError`.

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
| `loadNamespace(ns, factory?, locale?)` | `(ns: string, factory?: NamespaceFactory, locale?: Locale) => Promise<void>` | Load a registered namespace for `locale` (defaults to active locale). Pass `factory` to register first — one call does register + load. Deduplicates per `ns + locale`. |
| `preload(locale)`               | `(locale: Locale) => Promise<void>`                                                       | Load a catalog without switching the active locale.                                                                            |
| `setLocale(locale)`             | `(locale: Locale) => Promise<void>`                                                       | Load if needed, then switch and notify subscribers. On load failure, locale is unchanged.                                      |
| `register(locale, source)`      | `(locale: Locale, source: LocaleSource<M>) => Promise<void>`                              | Register or replace a locale source. Returns a Promise that resolves when loading is complete. Async loaders start immediately. |
| `registerNamespace(ns, factory)` | `(ns: string, factory: NamespaceFactory) => void`                                    | Register a namespace factory without loading. Use `loadNamespace()` to trigger loading.                                      |
| `scope(prefix)`                 | `(prefix: MessageBranchKeys<M> \| string) => ScopedI18n`                                  | Return a prefix-bound `{ fmt, t, ti, tp, tpi, has }` helper. Memoized per prefix — same object reference for the same prefix string. |
| `fork(overrides?)`              | `(overrides?: Omit<I18nOptions<M>, 'catalogs'>) => I18n<M>`                               | Create an isolated child instance from the current catalog snapshot.                                                           |
| `getState()`                    | `() => I18nState`                                                                         | Extract a serializable snapshot of loaded catalogs and the active locale.                                                      |
| `restoreState(state)`           | `(state: I18nState) => void`                                                              | Hydrate this instance from serialized state. Clears namespace markers. Notifies subscribers.                                   |
| `has(key, options?)`            | `(key: MessageLeafKeys<M> \| string, options?: HasOptions) => boolean`                   | Check if a key exists in the active fallback chain. Leaf-only by default; `{ kind: 'branch' }` checks branch keys.             |
| `isLoaded(locale)`              | `(locale: Locale) => boolean`                                                             | Return `true` if the catalog for `locale` is fully resolved. Throws on an invalid BCP 47 tag.                                  |
| `isNamespaceLoaded(ns, locale?)` | `(ns: string, locale?: Locale) => boolean`                                               | Return `true` if the namespace is loaded for `locale` (defaults to active locale). Throws on an invalid BCP 47 tag.            |
| `disposalSignal`                | `AbortSignal`                                                                             | Aborted when `dispose()` is called.                                                                                            |
| `dispose()`                     | `() => void`                                                                              | Release all subscribers, catalogs, loaders, and namespace state. Idempotent.                                                   |
| `disposed`                      | `boolean`                                                                                 | `true` after `dispose()` has been called.                                                                                      |
| `[Symbol.dispose]()`            | `() => void`                                                                              | Delegates to `dispose()`. Enables `using` declarations.                                                                        |
| `getSupportedLocales(options?)` | `(options?: { sorted?: boolean }) => Locale[]`                                            | Return all registered locales.                                                                                                 |
| `getSnapshot()`                 | `() => I18nSnapshot`                                                                      | Return the current `{ locale, t, ti, tp, tpi }` snapshot. Object identity changes on each observable change.                           |
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

### `ti()`

Segmented interpolation — like `t()`, but returns the template as a mixed array of string segments and typed replacement values, for embedding components or other non-string content inside translated text. Generic over the value type, so it works with React nodes, Vue vnodes, Svelte snippets, or anything else.

```ts
i18n.ti('error', {
  reloadLink: <a href="/reload">reload</a>,
  supportLink: <a href="/support">contact support</a>,
});
// ['Try to ', <a>reload</a>, ' or ', <a>contact support</a>, ' for help.']
```

Resolution follows the same fallback chain as `t()`. A missing key falls back through `onMissingKey` (one string segment). A missing var keeps its `{placeholder}` string segment. Empty string segments are omitted. Note: `ti` is also available on `createTranslator()` instances and `ScopedI18n`.

### `tpi()`

Segmented plural interpolation — CLDR plural selection and count injection exactly like `tp()`, but the chosen template renders to a mixed `Array<string | number | V>` like `ti()`. `count` appears as a raw number segment (typed values pass through unstringified — apply `fmt.number()` yourself if you need grouping). Available on `I18n`, `ScopedI18n`, `Translator`, and `I18nSnapshot`.

```ts
i18n.tpi('inbox', 5, { vars: { sender: <UserChip user={sender} /> } });
// [5, ' messages from ', <UserChip />]
```

```ts
type TpiOptions<V> = { ordinal?: boolean; vars?: Record<string, V> };
```

### `registerNamespace()`

```ts
registerNamespace(ns: string, factory: NamespaceFactory): void
```

Registers a namespace factory without loading it. Use `loadNamespace()` to trigger loading when needed, or pass the factory to `loadNamespace()` to register and load in one call.

Re-registering a namespace updates the factory for future loads but does **not** reload if the namespace is already loaded. The new factory takes effect the next time the namespace marker is cleared (by a `register()` or `restoreState()` call).

Throws `LinguaDisposedError` if called on a disposed instance.

### `loadNamespace()`

```ts
loadNamespace(ns: string, factory?: NamespaceFactory, locale?: Locale): Promise<void>
```

Loads a registered namespace for `locale` (defaults to the active locale). Pass `factory` to register it first — one call does register + load. The factory receives the target locale string and must return `Promise<Messages>` — namespace content is independent of the instance's catalog type `M`. Concurrent and repeated calls for the same `ns + locale` pair are deduplicated — the factory runs at most once per locale.

> **Note:** Calling `loadNamespace()` with a **new factory** after the namespace is already loaded updates the registry for future reloads (e.g. after `register()` replaces the catalog) but does **not** reload the namespace immediately. The new factory takes effect the next time the namespace marker is cleared.

Throws `LinguaNamespaceMissingError` if no factory is passed and the namespace was never registered.
Throws `LinguaDisposedError` synchronously if called on a disposed instance.

```ts
// Register + load in one call — e.g. when entering the settings route
await i18n.loadNamespace('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default));

// Pre-load for a specific locale
await i18n.loadNamespace('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default), 'de');

// Or split the steps
i18n.registerNamespace('settings', (locale) =>
  import(`./locales/${locale}/settings.json`).then((m) => m.default),
);
await i18n.loadNamespace('settings');
```

### `isNamespaceLoaded()`

```ts
isNamespaceLoaded(ns: string, locale?: Locale): boolean
```

Returns `true` if the namespace `ns` has been fully loaded for `locale` (defaults to active locale). Returns `false` if not registered, not yet loaded for this locale, or if the instance is disposed. Throws `LinguaInvalidLocaleError` for an invalid BCP 47 tag (when `locale` is passed).

### `getState()`

```ts
getState(): I18nState
```

Extracts a serializable snapshot of all **fully loaded** catalogs and the active locale.

**Warning:** Only fully resolved catalogs are included. Loader-only locales not yet preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.

```ts
const state = i18n.getState();
// JSON.stringify(state) and send to client
```

### `restoreState()`

```ts
restoreState(state: I18nState): void
```

Hydrates this instance from an `I18nState` produced by `getState()`.

- Replaces all catalogs with those from `state`.
- Sets the active locale to `state.locale`.
- Clears all namespace loaded-markers so that `loadNamespace()` can re-apply namespaces.
- Notifies subscribers.

Unlike `register()` and construction, this does **not** run the automatic dev-mode plural-form check (see [`validateCatalog()`](#validatecatalog)) — `state` is assumed to already have been registered, and therefore already checked, once on whatever system produced it.

Throws `LinguaRestoreError` if `state.locale` has no catalog in `state.catalogs`.
Throws `LinguaDisposedError` if called on a disposed instance.

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
- **Loaded-namespace markers are copied.** If the parent has already loaded a namespace, calling `loadNamespace()` on the fork for the same `ns + locale` pair is a no-op. This avoids redundant refetches in SSR fork-per-request patterns.

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
i18n.getSupportedLocales({ sorted: true }); // => ['de', 'en', 'fr']
```

### `has()`

```ts
has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | string, options?: HasOptions): boolean
```

Returns `true` if the key exists in the active fallback chain. Checks all locales in the chain in order.

- **Default (`kind: 'leaf'`)**: returns `true` only if the key maps to a string value — i.e. is resolvable by `t()`.
- **`{ kind: 'branch' }`**: returns `true` if the key is a prefix with keys beneath it — a plural branch resolvable by `tp()`, or any nested section.

```ts
// catalog: { inbox: { one: 'One message', other: '{count} messages' } }
i18n.has('inbox');                      // false — branch, not a leaf
i18n.has('inbox', { kind: 'branch' });  // true
i18n.has('inbox.one');                  // true  — explicit sub-key
i18n.has('missing');                    // false
```

### `isLoaded()`

```ts
isLoaded(locale: Locale): boolean
```

Returns `true` if the catalog for `locale` is fully resolved (i.e. not a pending async loader). Returns `false` for unregistered locales and pending loaders. Throws `LinguaInvalidLocaleError` for an invalid BCP 47 tag — a typo'd locale is a bug, not a `false`.

Primary use case: guarding `getState()` in SSR to avoid silently omitting locales that were registered as async loaders but never preloaded.

```ts
// SSR guard — ensure all locales are loaded before serialising
const locales = i18n.getSupportedLocales();
await Promise.all(locales.filter((l) => !i18n.isLoaded(l)).map((l) => i18n.preload(l)));
const state = i18n.getState(); // now includes all locales
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
- `isLoaded()` returns `false` for all locales.
- No subscribers are notified of further changes.
- `setLocale()` and `preload()` reject with `LinguaDisposedError`.
- `register()` throws `LinguaDisposedError`.
- `subscribe()` throws `LinguaDisposedError`.
- `loadNamespace()` throws `LinguaDisposedError`.

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

**Automatic dev-mode checks:** `createI18n()` already calls this internally, in dev builds only, every time a catalog becomes fully available — at construction (`createI18n({ catalogs })`), via `register()`, or once an async loader resolves — logging any warning through `console.warn`. Call `validateCatalog()` directly only when you want CI to fail the build on a warning rather than just log it; the automatic check already covers everyday authoring feedback with zero setup. The automatic check loads `validate.ts`'s logic as a separate, lazily-fetched chunk — it's never part of your production bundle either way.

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
  readonly ti: <V>(key: string, vars: Record<string, V>) => Array<string | V>;
  readonly tp: (key: string, count: number, options?: TpOptions) => string;
  readonly tpi: <V>(key: string, count: number, options?: TpiOptions<V>) => Array<string | number | V>;
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

Produced by `getState()` and consumed by `restoreState()`. Catalogs are stored as flat dot-notation maps.

### `NamespaceFactory`

```ts
type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => Promise<M>;
```

Factory passed to `registerNamespace()` / `loadNamespace()`. Receives the target locale and must return a `Promise<Messages>` with the namespace messages for that locale. Namespace content is independent of the instance's catalog type `M` — a namespace can introduce keys not present in the initial catalog shape.

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
  has(key: string, options?: HasOptions): boolean;
  t(key: string, vars?: TranslateVars): string;
  ti<V>(key: string, vars: Record<string, V>): Array<string | V>;
  tp(key: string, count: number, options?: TpOptions): string;
  tpi<V>(key: string, count: number, options?: TpiOptions<V>): Array<string | number | V>;
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

## SSR: `getState()` / `restoreState()`

No standalone functions — call these directly on an instance (see [`getState()`](#getstate) / [`restoreState()`](#restorestate) above).

```ts
// Server
const i18n = createI18n({ catalogs: { de: deMessages, en: enMessages }, locale: 'de' });
const state = i18n.getState();
// Embed in the HTML response:
// <script>window.__I18N__ = ${JSON.stringify(state)}</script>
```

```ts
// Client
const client = createI18n();
client.restoreState(window.__I18N__);
// Catalogs from state are immediately available; no network request needed.
```

## Error Classes

All errors thrown by the `@vielzeug/lingua` runtime extend `LinguaError`. Use `instanceof LinguaError` to catch any lingua error, or `instanceof` the specific subclass for precise handling.

```ts
import { LinguaDisposedError, LinguaError, LinguaMissingLocaleError } from '@vielzeug/lingua';

try {
  await i18n.setLocale('de');
} catch (err) {
  if (err instanceof LinguaMissingLocaleError) {
    // locale not registered — handle gracefully
  } else if (err instanceof LinguaError) {
    throw err;
  }
}
```

| Class                       | When thrown                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `LinguaError`               | Base class — `instanceof LinguaError` catches all lingua errors                 |
| `LinguaDisposedError`       | Any mutating API called on a disposed instance                                  |
| `LinguaInvalidCountError`   | `tp()` — `count` is non-finite                                                  |
| `LinguaCountInVarsError`    | `tp()` — `vars.count` was passed explicitly                                     |
| `LinguaMissingLocaleError`  | `preload()` / `setLocale()` — locale has no registered source                   |
| `LinguaInvalidLocaleError`  | Any API receiving an invalid BCP 47 tag                                         |
| `LinguaNamespaceMissingError` | Namespace requested but not loaded for the current locale                     |
| `LinguaRestoreError`        | `restoreState()` — `state.locale` absent from `state.catalogs` |
