---
title: 'Lingua: API Reference'
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol                 | Purpose                                                      | Execution mode | Common gotcha                                                                               |
| ---------------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `createTranslator()`   | Compile one immutable locale catalog                         | Sync           | No fallback locales                                                                         |
| `createI18n()`         | Create mutable locale and catalog store                      | Sync           | Provide eager catalogs, a loader, or both                                                   |
| `createFormatter()`    | Create a cached Intl facade from `/format`                   | Sync           | Pass a locale getter for dynamic locale changes                                             |
| `createReactiveI18n()` | Mirror an i18n instance into ripple readables from `/ripple` | Sync           | Optional `@vielzeug/ripple` peer; import from subpath                                       |
| `catalogKeys()`        | Enumerate message keys as dotted paths                       | Sync           | Takes a catalog (or subtree) only; for an i18n instance pass `state.catalogs[state.locale]` |
| `validateCatalog()`    | Check explicit plural forms from `/validate`                 | Sync           | Import from subpath                                                                         |
| `compareCatalogs()`    | Compare key parity across locales from `/validate`           | Sync           | First locale is the base; import from subpath                                               |
| `LinguaError`          | Base class for Lingua errors                                 | Sync           | Use `instanceof LinguaError` for broad narrowing                                            |

## Package Entry Point

| Import                      | Purpose                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `@vielzeug/lingua`          | Translation factories, state types, and Lingua errors                                       |
| `@vielzeug/lingua/format`   | Standalone cached Intl formatter factory                                                    |
| `@vielzeug/lingua/ripple`   | `createReactiveI18n()`: reactive locale/translate bridge (optional `@vielzeug/ripple` peer) |
| `@vielzeug/lingua/validate` | `validateCatalog()`, `compareCatalogs()`, and `ValidationIssue`                             |

## Translation Factories

### createTranslator

```ts
function createTranslator<C extends Catalog>(catalog: C, options?: TranslatorOptions): Translator<C>;
```

Compiles one catalog and returns an immutable fixed-locale translator. Locale defaults to `en` and controls plural selection and diagnostics.

| Parameter | Type                | Description                                               |
| --------- | ------------------- | --------------------------------------------------------- |
| `catalog` | `C`                 | One catalog containing only messages and grouping objects |
| `options` | `TranslatorOptions` | Locale and missing-message strategy                       |

**Returns:** `Translator<C>`.

**Example:**

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator({ save: 'Enregistrer' }, { locale: 'fr' });

translator.translate('save');
```

| Method             | Signature                                                            | Returns                |
| ------------------ | -------------------------------------------------------------------- | ---------------------- |
| `translate`        | `(textKey, options?)` or `(pluralKey, { count, ordinal?, values? })` | Rendered string        |
| `translateUnkeyed` | `(key: string, options?)`                                            | Rendered string        |
| `locale`           | `Locale`                                                             | Resolved active locale |

---

### createI18n

```ts
function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C>;
```

Creates the catalog store, current locale state, and the active translator.

| Parameter             | Type                          | Description                                      |
| --------------------- | ----------------------------- | ------------------------------------------------ |
| `options.catalogs`    | `Catalogs<C>`                 | Eager locale catalogs                            |
| `options.locale`      | `Locale`                      | Initial locale; defaults to `en`                 |
| `options.loadCatalog` | `(locale) => Promise<C> \| C` | Loader for catalogs not supplied eagerly         |
| `options.fallback`    | `Locale \| readonly Locale[]` | Fallback locales loaded with the selected locale |
| `options.missing`     | `MissingStrategy`             | Missing-key/value strategy                       |

Provide at least one of `catalogs` or `loadCatalog`; you may combine eager `catalogs` with `loadCatalog` for later locales.

**Returns:** `I18n<C>`, with every `Translator<C>` method plus lifecycle methods.

**Example:**

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: { en: { title: 'Home' } },
  locale: 'en',
});
i18n.translate('title');
```

| Method or property | Signature                             | Returns                                                        |
| ------------------ | ------------------------------------- | -------------------------------------------------------------- |
| `translate`        | Translator method                     | Rendered string                                                |
| `translateUnkeyed` | Translator method                     | Rendered string for a runtime key outside the typed key set    |
| `load`             | `({ locale? })`                       | `Promise<void>` after the locale and configured fallbacks load |
| `setLocale`        | `(locale)`                            | `Promise<void>` after an atomic loaded-locale commit           |
| `isLoaded`         | `({ locale? })`                       | `boolean`                                                      |
| `getSnapshot`      | `()`                                  | Current locale, referentially stable until it changes          |
| `subscribe`        | `(listener, { immediate?, signal? })` | Unsubscribe function; listener receives the new locale         |
| `serialize`        | `()`                                  | Loader-free `SerializedI18n<C>` for SSR transfer               |
| `dispose`          | `()`                                  | `void`                                                         |
| `locale`           | `Locale`                              | Current canonical locale                                       |
| `disposed`         | `boolean`                             | Disposal state                                                 |
| `disposalSignal`   | `AbortSignal`                         | Aborts on disposal                                             |
| `[Symbol.dispose]` | `()`                                  | Delegates to `dispose()`                                       |

---

## Reactive bridge (`@vielzeug/lingua/ripple`)

### createReactiveI18n

```ts
function createReactiveI18n<C extends Catalog>(i18n: I18n<C>): ReactiveI18n<C>;
```

Bridges a lingua instance into `@vielzeug/ripple` so translated strings are reactive. `i18n.translate()` is not ripple-reactive on its own: reading it inside a `computed()` computes once and never re-runs, since it registers no tracked dependency. The bridge's `translate` and `translateUnkeyed` first read the reactive `locale` readable, so any binding built on them re-evaluates the instant `setLocale()` resolves. For runtime-assembled keys inside reactive bindings use the bridge's `translateUnkeyed`: calling `i18n.translateUnkeyed` directly skips the reactive locale and caches the first result.

`@vielzeug/ripple` is an optional peer dependency: install it only when you use this subpath.

```ts
import { createI18n } from '@vielzeug/lingua';
import { createReactiveI18n } from '@vielzeug/lingua/ripple';
import { computed } from '@vielzeug/ripple';

const reactive = createReactiveI18n(createI18n({ catalogs, locale: 'en' }));

const heading = computed(() => reactive.translate('title')); // re-computes on setLocale()
await reactive.i18n.setLocale('fr');
```

| Property or method | Signature          | Returns                                                                         |
| ------------------ | ------------------ | ------------------------------------------------------------------------------- |
| `i18n`             | `I18n<C>`          | The underlying instance for imperative work (`setLocale`, `load`, disposal)     |
| `locale`           | `Readable<Locale>` | Reactive locale: reading it inside a computed/template registers the dependency |
| `translate`        | `(key, options?)`  | Rendered string; re-evaluates whenever the locale changes                       |
| `translateUnkeyed` | `(key, options?)`  | Rendered string for a runtime key; re-evaluates whenever the locale changes     |

---

## Catalog Utilities

### catalogKeys

```ts
function catalogKeys<C extends Catalog>(catalog: C): ReadonlyArray<MessageKey<C>>;
```

Enumerates every message key as a dotted path. Traverses nested grouping objects and explicit `{ plural: ... }` messages, producing the same paths that `TextKey<C>` represents at the type level. Pass any catalog object or subtree; for an `I18n` instance, read its current locale catalog first.

| Parameter | Type                | Description                               |
| --------- | ------------------- | ----------------------------------------- |
| `catalog` | `C extends Catalog` | Raw catalog object or any catalog subtree |

**Returns:** `ReadonlyArray<MessageKey<C>>`: dotted paths to every text and plural message.

```ts
import { catalogKeys, createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: { en: { nav: { home: 'Home', settings: 'Settings' } } },
  locale: 'en',
});

const state = i18n.serialize();
const allKeys = catalogKeys(state.catalogs[state.locale]); // ['nav.home', 'nav.settings']
const navKeys = catalogKeys(state.catalogs.en.nav); // ['home', 'settings']
```

---

## Intl formatting

### createFormatter

```ts
import { createFormatter } from '@vielzeug/lingua/format';

const format = createFormatter(() => i18n.locale);
format.number(1_234.5);
format.currency(19.99, 'USD');
format.date(new Date(), { dateStyle: 'medium' });
```

The formatter caches bounded `Intl` instances and resolves a locale getter for every call.

## Validation

### validateCatalog

```ts
function validateCatalog(catalog: Catalog, locale: Locale): ValidationIssue[];
```

Validates explicit plural messages against locale plural categories after catalog structural validation.

| Parameter | Type      | Description                  |
| --------- | --------- | ---------------------------- |
| `catalog` | `Catalog` | Explicit catalog to validate |
| `locale`  | `Locale`  | BCP 47 locale tag            |

**Returns:** `ValidationIssue[]`.

**Example:**

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';

validateCatalog({ inbox: { plural: { one: 'One message' } } }, 'en');
```

### compareCatalogs

```ts
function compareCatalogs<C extends Catalog>(catalogs: Catalogs<C>): CatalogComparison;
```

Compares key sets across locales. First locale is the base: reports keys missing in each target and keys present in targets but absent from base. Validates each catalog structurally.

| Parameter  | Type          | Description                      |
| ---------- | ------------- | -------------------------------- |
| `catalogs` | `Catalogs<C>` | Locale-keyed catalogs to compare |

**Returns:** `CatalogComparison` with `missing` and `extra` arrays.

```ts
import { compareCatalogs } from '@vielzeug/lingua/validate';

const result = compareCatalogs({
  en: { greeting: 'Hello', farewell: 'Goodbye' },
  de: { greeting: 'Hallo' },
});
// { missing: [{ key: 'farewell', locale: 'de' }], extra: [] }
```

## Types

```ts
type Locale = string;
type PluralCategory = Intl.LDMLPluralRule;
type PluralMessage = { readonly plural: Partial<Record<PluralCategory, string>> };
type CatalogNode = Catalog | PluralMessage | string;
type Catalog = { readonly [key: string]: CatalogNode };
type Catalogs<C extends Catalog = Catalog> = Record<Locale, C>;

type MissingInfo = { readonly key: string; readonly locale: Locale; readonly name?: string };
type MissingHandler = (info: MissingInfo) => string;
type MissingStrategy = 'throw' | 'key' | MissingHandler;

type TranslatorOptions = { readonly locale?: Locale; readonly missing?: MissingStrategy };

type I18nOptions<C extends Catalog = Catalog> = {
  readonly fallback?: Locale | readonly Locale[];
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
} & (
  | { readonly catalogs: Catalogs<C>; readonly loadCatalog?: CatalogLoader<C> }
  | { readonly catalogs?: Catalogs<C>; readonly loadCatalog: CatalogLoader<C> }
);

type CatalogLoader<C extends Catalog> = (locale: Locale) => Promise<C> | C;

type SerializedI18n<C extends Catalog = Catalog> = {
  readonly catalogs: Catalogs<C>;
  readonly locale: Locale;
};

type I18n<C extends Catalog = Catalog> = Translator<C> & {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): Locale;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): SerializedI18n<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (locale: Locale) => void, options?: SubscribeOptions): () => void;
  [Symbol.dispose](): void;
};

type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  translate(key: TextKey<C>, options?: TranslateOptions): string;
  translate(key: PluralKey<C>, options: PluralOptions): string;
  translateUnkeyed(key: string, options?: TranslateOptions | PluralOptions): string;
};
```

```ts
type Values = Record<string, unknown>;
type TranslateOptions = { values?: Values };
type PluralOptions = TranslateOptions & { count: number; ordinal?: boolean };
type SubscribeOptions = { immediate?: boolean; signal?: AbortSignal };

type CatalogPaths<
  C,
  Leaf,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends Leaf
    ? Prefix
    : C extends PluralMessage
      ? never
      : C extends Catalog
        ? {
            [K in string & keyof C]: CatalogPaths<C[K], Leaf, Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
          }[string & keyof C]
        : never
  : never;

type MessageKey<C> = CatalogPaths<C, string | PluralMessage>;
type TextKey<C> = CatalogPaths<C, string>;
type PluralKey<C> = CatalogPaths<C, PluralMessage>;

type ValidationIssue = { key: string; locale: Locale; missing: Intl.LDMLPluralRule };
type CatalogComparison = {
  readonly missing: ReadonlyArray<{ key: string; locale: Locale }>;
  readonly extra: ReadonlyArray<{ key: string; locale: Locale }>;
};
```

## Errors

| Error                           | Trigger                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `LinguaDisposedError`           | State mutation or subscription after `dispose()`        |
| `LinguaInvalidCatalogError`     | Invalid catalog node or reserved key                    |
| `LinguaInvalidLocaleError`      | Invalid BCP 47 locale tag                               |
| `LinguaInvalidPluralCountError` | Non-finite plural count                                 |
| `LinguaMissingCatalogError`     | No `loadCatalog` function or catalog source unavailable |
| `LinguaMissingKeyError`         | Missing translation key when `missing: 'throw'`         |
| `LinguaMissingValueError`       | Missing interpolation value when `missing: 'throw'`     |
