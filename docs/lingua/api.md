---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createTranslator()` | Compile immutable locale catalogs | Sync | Locale is fixed for translator lifetime |
| `createI18n()` | Create mutable locale and resource store | Sync | Optional resources require `load()` before use |
| `hydrateI18n()` | Create store from serialized loaded resources | Sync | Serialized state never includes loaders |
| `createFormatter()` | Format Intl values from `/format` | Sync | Import from subpath, not main entry |
| `validateCatalog()` | Check explicit plural forms from `/validate` | Sync | Import from subpath, not main entry |
| `LinguaError` | Base class for Lingua errors | Sync | Use `LinguaError.is()` for broad error narrowing |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/lingua` | Translation factories, state types, and Lingua errors |
| `@vielzeug/lingua/format` | `createFormatter()` and formatter types |
| `@vielzeug/lingua/validate` | `validateCatalog()` and `ValidationIssue` |

## Translation Factories

### createTranslator

```ts
function createTranslator<C extends Catalog>(
  catalogs: Catalogs<C>,
  options?: TranslatorOptions,
): Translator<C>;
```

Compiles locale catalogs and returns an immutable translator.

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
| `segments` | `(textKey, { values })` or `(pluralKey, { count, ordinal?, values? })` | String and typed-value segments |
| `locale` | `Locale` | Resolved active locale |

---

### createI18n

```ts
function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C>;
```

Creates a resource store, current locale state, and immutable translator snapshots.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.resources` | `Resources<C>` | Declared core and feature resource sources |
| `options.locale` | `Locale` | Initial locale; defaults to `en` |
| `options.fallback` | `Locale \| readonly Locale[]` | Fallback locale chain |
| `options.onMissingKey` | `(key, locale) => string` | Missing-message handler |
| `options.onMissingValue` | `(name, key, locale) => string` | Missing-interpolation handler |

**Returns:** `I18n<C>`.

**Example:**

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: { en: { title: 'Home' }, fr: { title: 'Accueil' } },
  },
});

await i18n.setLocale('fr');
i18n.translate('title');
```

| Method or property | Signature | Returns |
| --- | --- | --- |
| `translate` | `(textKey, options?)` or `(pluralKey, { count, ordinal?, values? })` | Rendered string |
| `segments` | `(textKey, { values })` or `(pluralKey, { count, ordinal?, values? })` | String and typed-value segments |
| `load` | `(resource, { locale? })` | `Promise<void>` after resource resolution |
| `setLocale` | `(locale, { load? })` | `Promise<void>` after core and requested resources resolve |
| `isLoaded` | `(resource, { locale? })` | `boolean` |
| `getSnapshot` | `()` | `I18nSnapshot<C>` |
| `subscribe` | `(listener, { immediate?, signal? })` | Unsubscribe function |
| `serialize` | `()` | Loader-free `I18nState<C>` |
| `dispose` | `()` | `void` |
| `locale` | `Locale` | Current canonical locale |
| `disposed` | `boolean` | Disposal state |
| `disposalSignal` | `AbortSignal` | Aborts on disposal |
| `[Symbol.dispose]` | `()` | Delegates to `dispose()` |

Resources merge in declaration order. Later resource declarations override same keys from earlier declarations, independent of async completion order.

---

### hydrateI18n

```ts
function hydrateI18n<C extends Catalog>(
  state: I18nState<C>,
  options?: Omit<I18nOptions<C>, 'locale' | 'resources'>,
): I18n<C>;
```

Creates an i18n store from an SSR state payload containing resolved raw catalogs.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `I18nState<C>` | Version `2`, active locale, and loader-free resources |
| `options` | `Omit<I18nOptions<C>, 'locale' \| 'resources'>` | Fallback and missing-message handlers |

**Returns:** `I18n<C>`.

**Example:**

```ts
import { createI18n, hydrateI18n } from '@vielzeug/lingua';

const server = createI18n({ locale: 'en', resources: { core: { en: { title: 'Home' } } } });
const client = hydrateI18n(server.serialize());

client.translate('title');
```

## Formatting and Validation

### createFormatter

```ts
function createFormatter(source: string | (() => string)): Formatter;
```

Creates cached Intl formatters using a static locale or locale getter.

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

---

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
// [{ key: 'inbox', locale: 'en', missing: 'other' }]
```

## Types

### Catalog types

```ts
type Locale = string;
type PluralCategory = Intl.LDMLPluralRule;
type PluralMessage = { readonly plural: Partial<Record<PluralCategory, string>> };
type CatalogNode = Catalog | PluralMessage | string;
type Catalog = { readonly [key: string]: CatalogNode };
type Catalogs<C extends Catalog = Catalog> = Record<Locale, C>;
```

### Resource and state types

```ts
type ResourceLoader<C extends Catalog = Catalog> = () => Promise<C>;
type ResourceSource<C extends Catalog = Catalog> = C | ResourceLoader<C>;
type ResourceDefinition<C extends Catalog = Catalog> = Record<Locale, ResourceSource<C>>;
type Resources<C extends Catalog = Catalog> = Record<string, ResourceDefinition<C>>;
type LoadedResources<C extends Catalog = Catalog> = Record<string, Record<Locale, C>>;

type I18nOptions<C extends Catalog = Catalog> = TranslatorOptions & {
  resources: Resources<C>;
};

type I18nState<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly resources: LoadedResources<C>;
  readonly version: 2;
};
```

### Translation types

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
```

```ts
type MessageKey<C, Prefix extends string = '', Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1]> =
  Depth extends readonly [unknown, ...infer Rest]
    ? C extends string | PluralMessage
      ? Prefix
      : C extends Catalog
        ? { [K in string & keyof C]: MessageKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest> }[string & keyof C]
        : never
    : never;

type TextKey<C, Prefix extends string = '', Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1]> =
  Depth extends readonly [unknown, ...infer Rest]
    ? C extends string
      ? Prefix
      : C extends Catalog
        ? { [K in string & keyof C]: TextKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest> }[string & keyof C]
        : never
    : never;

type PluralKey<C, Prefix extends string = '', Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1]> =
  Depth extends readonly [unknown, ...infer Rest]
    ? C extends PluralMessage
      ? Prefix
      : C extends Catalog
        ? { [K in string & keyof C]: PluralKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest> }[string & keyof C]
        : never
    : never;

type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  segments<V>(key: TextKey<C> | (string & {}), options: TranslateOptions & { values: Record<string, V> }): Array<string | V>;
  segments<V>(key: PluralKey<C> | (string & {}), options: PluralOptions & { values?: Record<string, V> }): Array<string | number | V>;
  translate(key: TextKey<C> | (string & {}), options?: TranslateOptions): string;
  translate(key: PluralKey<C> | (string & {}), options: PluralOptions): string;
};

type I18nSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

type I18n<C extends Catalog = Catalog> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): I18nSnapshot<C>;
  isLoaded(resource: string, options?: { locale?: Locale }): boolean;
  load(resource: string, options?: { locale?: Locale }): Promise<void>;
  readonly locale: Locale;
  segments<V>(key: TextKey<C> | (string & {}), options: TranslateOptions & { values: Record<string, V> }): Array<string | V>;
  segments<V>(key: PluralKey<C> | (string & {}), options: PluralOptions & { values?: Record<string, V> }): Array<string | number | V>;
  serialize(): I18nState<C>;
  setLocale(locale: Locale, options?: { load?: readonly string[] }): Promise<void>;
  subscribe(listener: (snapshot: I18nSnapshot<C>) => void, options?: SubscribeOptions): () => void;
  translate(key: TextKey<C> | (string & {}), options?: TranslateOptions): string;
  translate(key: PluralKey<C> | (string & {}), options: PluralOptions): string;
};
```

### Formatter types

```ts
type DurationValue = Partial<Record<'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'months' | 'nanoseconds' | 'seconds' | 'weeks' | 'years', number>>;
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

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `LinguaError` | Base error class | `LinguaError.is(error)` narrows unknown errors |
| `LinguaDisposedError` | Mutation or subscription after disposal | Extends `LinguaError` |
| `LinguaInvalidCatalogError` | Malformed catalog node or reserved key | Extends `LinguaError` |
| `LinguaInvalidLocaleError` | Invalid BCP 47 locale | Extends `LinguaError` |
| `LinguaInvalidPluralCountError` | Non-finite plural `count` | Extends `LinguaError` |
| `LinguaInvalidStateError` | Unsupported serialized-state version | Extends `LinguaError` |
| `LinguaMissingResourceError` | Missing resource source for requested locale | Extends `LinguaError` |
