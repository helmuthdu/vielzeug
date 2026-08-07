---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createCatalogTranslator()` | Compile one immutable locale catalog | Sync | No fallback locales |
| `createTranslator()` | Compile immutable locale catalogs | Sync | Locale is fixed for translator lifetime |
| `createTranslationStore()` | Create mutable locale and catalog store | Sync | Load lazy locale explicitly |
| `hydrateTranslationStore()` | Create store from serialized loaded catalogs | Sync | Serialized state never includes loaders |
| `createFormatter()` | Format Intl values from `/format` | Sync | Import from subpath |
| `validateCatalog()` | Check explicit plural forms from `/validate` | Sync | Import from subpath |
| `LinguaError` | Base class for Lingua errors | Sync | Use `LinguaError.is()` for broad narrowing |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/lingua` | Translation factories, state types, and Lingua errors |
| `@vielzeug/lingua/format` | `createFormatter()` and formatter types |
| `@vielzeug/lingua/validate` | `validateCatalog()` and `ValidationIssue` |

## Translation Factories

### createCatalogTranslator

```ts
function createCatalogTranslator<C extends Catalog>(
  catalog: C,
  options?: CatalogTranslatorOptions,
): Translator<C>;
```

Compiles one catalog and returns an immutable fixed-locale translator. Locale defaults to `en` and controls plural selection and diagnostics.

| Parameter | Type | Description |
| --- | --- | --- |
| `catalog` | `C` | One catalog containing only messages and grouping objects |
| `options` | `CatalogTranslatorOptions` | Locale and missing-message handlers; fallback is unavailable |

**Returns:** `Translator<C>`.

**Example:**

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const translator = createCatalogTranslator(
  { save: 'Enregistrer' },
  { locale: 'fr' },
);

translator.translate('save');
```

---

### createTranslator

```ts
function createTranslator<C extends Catalog>(catalogs: Catalogs<C>, options?: TranslatorOptions): Translator<C>;
```

Compiles locale catalogs and returns immutable translator.

| Parameter | Type | Description |
| --- | --- | --- |
| `catalogs` | `Catalogs<C>` | Locale-keyed catalog objects |
| `options` | `TranslatorOptions` | Locale, fallback chain, and missing-message handlers |

**Returns:** `Translator<C>`.

**Example:**

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { en: { save: 'Save' }, fr: { save: 'Enregistrer' } },
  { locale: 'fr' },
);

translator.translate('save');
```

| Method | Signature | Returns |
| --- | --- | --- |
| `translate` | `(textKey, options?)` or `(pluralKey, { count, ordinal?, values? })` | Rendered string |
| `translateDynamic` | `(key, options?)` | Rendered string for runtime key |
| `segments` | `(textKey, { values })` or `(pluralKey, { count, ordinal?, values? })` | String and typed-value segments |
| `segmentsDynamic` | `(key, options)` | Segments for runtime key |
| `locale` | `Locale` | Resolved active locale |

---

### createTranslationStore

```ts
function createTranslationStore<C extends Catalog>(options: TranslationStoreOptions<C>): TranslationStore<C>;
```

Creates catalog store, current locale state, and immutable translator snapshots.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.catalogs` | `CatalogSources<C>` | Static catalogs or lazy locale loaders |
| `options.locale` | `Locale` | Initial locale; defaults to `en` |
| `options.fallback` | `Locale \| readonly Locale[]` | Fallback locale chain |
| `options.onMissingKey` | `(key, locale) => string` | Missing-message handler |
| `options.onMissingValue` | `(name, key, locale) => string` | Missing-interpolation handler |

**Returns:** `TranslationStore<C>`, with every `Translator<C>` method plus lifecycle methods.

**Example:**

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const translations = createTranslationStore({
  catalogs: { en: { title: 'Home' }, fr: { title: 'Accueil' } },
  locale: 'en',
});

await translations.setLocale('fr');
translations.translate('title');
```

| Method or property | Signature | Returns |
| --- | --- | --- |
| `translate` | Translator method | Rendered string |
| `segments` | Translator method | String and typed-value segments |
| `load` | `({ locale? })` | `Promise<void>` after catalog resolution |
| `setLocale` | `(locale)` | `Promise<void>` after locale commit; never loads implicitly |
| `isLoaded` | `({ locale? })` | `boolean` |
| `getSnapshot` | `()` | `TranslationSnapshot<C>` |
| `subscribe` | `(listener, { immediate?, signal? })` | Unsubscribe function |
| `serialize` | `()` | Loader-free `TranslationState<C>` |
| `dispose` | `()` | `void` |
| `locale` | `Locale` | Current canonical locale |
| `disposed` | `boolean` | Disposal state |
| `disposalSignal` | `AbortSignal` | Aborts on disposal |
| `[Symbol.dispose]` | `()` | Delegates to `dispose()` |

---

### hydrateTranslationStore

```ts
function hydrateTranslationStore<C extends Catalog>(
  state: TranslationState<C>,
  options?: Omit<TranslationStoreOptions<C>, 'locale' | 'catalogs'>,
): TranslationStore<C>;
```

Creates translation store from SSR state payload containing resolved raw catalogs.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `TranslationState<C>` | Version `3`, active locale, and loader-free catalogs |
| `options` | `Omit<TranslationStoreOptions<C>, 'locale' \| 'catalogs'>` | Fallback and missing-message handlers |

**Returns:** `TranslationStore<C>`.

**Example:**

```ts
import { createTranslationStore, hydrateTranslationStore } from '@vielzeug/lingua';

const server = createTranslationStore({ catalogs: { en: { title: 'Home' } }, locale: 'en' });
const client = hydrateTranslationStore(server.serialize());

client.translate('title');
```

## Formatting and Validation

### createFormatter

```ts
function createFormatter(source: string | (() => string)): Formatter;
```

Creates cached Intl formatters using static locale or locale getter.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `string \| (() => string)` | Static locale or locale getter |

**Returns:** `Formatter`.

**Example:**

```ts
import { createFormatter } from '@vielzeug/lingua/format';

const formatter = createFormatter('en-US');
formatter.currency(19.99, 'USD');
```

| Method | Signature | Returns |
| --- | --- | --- |
| `number` | `(value, options?)` | `string` |
| `currency` | `(value, currency, options?)` | `string` |
| `date` | `(value, options?)` | `string` |
| `relative` | `(value, unit, options?)` | `string` |
| `list` | `(value, options?)` | `string` |
| `duration` | `(value, options?)` | `string` |

### validateCatalog

```ts
function validateCatalog(catalog: Catalog, locale: Locale): ValidationIssue[];
```

Validates explicit plural messages against locale plural categories after catalog structural validation.

| Parameter | Type | Description |
| --- | --- | --- |
| `catalog` | `Catalog` | Explicit catalog to validate |
| `locale` | `Locale` | BCP 47 locale tag |

**Returns:** `ValidationIssue[]`.

**Example:**

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';

validateCatalog({ inbox: { plural: { one: 'One message' } } }, 'en');
```

## Types

```ts
type Locale = string;
type PluralCategory = Intl.LDMLPluralRule;
type PluralMessage = { readonly plural: Partial<Record<PluralCategory, string>> };
type CatalogNode = Catalog | PluralMessage | string;
type Catalog = { readonly [key: string]: CatalogNode };
type Catalogs<C extends Catalog = Catalog> = Record<Locale, C>;
type CatalogTranslatorOptions = Omit<TranslatorOptions, 'fallback'>;
type CatalogLoader<C extends Catalog = Catalog> = () => Promise<C>;
type CatalogSource<C extends Catalog = Catalog> = C | CatalogLoader<C>;
type CatalogSources<C extends Catalog = Catalog> = Record<Locale, CatalogSource<C>>;
type LoadedCatalogs<C extends Catalog = Catalog> = Catalogs<C>;

type TranslationStoreOptions<C extends Catalog = Catalog> = TranslatorOptions & {
  catalogs: CatalogSources<C>;
};

type TranslationState<C extends Catalog = Catalog> = {
  readonly catalogs: LoadedCatalogs<C>;
  readonly locale: Locale;
  readonly version: 3;
};

type TranslationSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

type TranslationStore<C extends Catalog = Catalog> = Translator<C> & {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): TranslationSnapshot<C>;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): TranslationState<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (snapshot: TranslationSnapshot<C>) => void, options?: SubscribeOptions): () => void;
  [Symbol.dispose](): void;
};
```

```ts
type Values = Record<string, unknown>;
type TranslateOptions = { values?: Values };
type PluralOptions = TranslateOptions & { count: number; ordinal?: boolean };
type TranslatorOptions = {
  fallback?: Locale | readonly Locale[];
  locale?: Locale;
  onMissingKey?: (key: string, locale: Locale) => string;
  onMissingValue?: (name: string, key: string, locale: Locale) => string;
};
type SubscribeOptions = { immediate?: boolean; signal?: AbortSignal };

type DurationValue = Partial<Record<
  'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'months' | 'nanoseconds' | 'seconds' | 'weeks' | 'years',
  number
>>;

type DurationFormatOptions = {
  hours?: '2-digit' | 'numeric';
  microseconds?: 'numeric';
  milliseconds?: 'numeric';
  minutes?: '2-digit' | 'numeric';
  nanoseconds?: 'numeric';
  seconds?: '2-digit' | 'numeric';
  style?: 'digital' | 'long' | 'narrow' | 'short';
};

type ListFormatOptions = { style?: 'long' | 'narrow' | 'short'; type?: 'and' | 'or' };

type Formatter = {
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  duration(value: DurationValue, options?: DurationFormatOptions): string;
  list(value: Array<string | number>, options?: ListFormatOptions): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
};

type ValidationIssue = { key: string; locale: Locale; missing: Intl.LDMLPluralRule };
```

## Errors

| Error | Trigger |
| --- | --- |
| `LinguaDisposedError` | State mutation or subscription after `dispose()` |
| `LinguaInvalidCatalogError` | Invalid catalog node or reserved key |
| `LinguaInvalidLocaleError` | Invalid BCP 47 locale tag |
| `LinguaInvalidPluralCountError` | Non-finite plural count |
| `LinguaInvalidStateError` | Unsupported serialized state version |
| `LinguaMissingCatalogError` | Catalog has no source for requested locale |
