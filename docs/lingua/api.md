---
title: Lingua — API Reference
description: Complete API reference for @vielzeug/lingua.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createTranslator()` | Compile one immutable locale catalog | Sync | No fallback locales |
| `createI18n()` | Create mutable locale and catalog store | Sync | Provide catalogs, serialized state, or a loader |
| `createFormatter()` | Create a cached Intl facade from `/format` | Sync | Pass a locale getter for dynamic locale changes |
| `catalogKeys()` | Enumerate message keys as dotted paths | Sync | Accepts i18n instance (current locale) or raw catalog; traverse subtrees for group-scoped keys |
| `validateCatalog()` | Check explicit plural forms from `/validate` | Sync | Import from subpath |
| `compareCatalogs()` | Compare key parity across locales from `/validate` | Sync | First locale is the base; import from subpath |
| `LinguaError` | Base class for Lingua errors | Sync | Use `instanceof LinguaError` for broad narrowing |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/lingua` | Translation factories, state types, and Lingua errors |
| `@vielzeug/lingua/format` | Standalone cached Intl formatter factory |
| `@vielzeug/lingua/validate` | `validateCatalog()`, `compareCatalogs()`, and `ValidationIssue` |

## Translation Factories

### createTranslator

```ts
function createTranslator<C extends Catalog>(catalog: C, options?: TranslatorOptions): Translator<C>;
```

Compiles one catalog and returns an immutable fixed-locale translator. Locale defaults to `en` and controls plural selection and diagnostics.

| Parameter | Type | Description |
| --- | --- | --- |
| `catalog` | `C` | One catalog containing only messages and grouping objects |
| `options` | `TranslatorOptions` | Locale and missing-message strategy |

**Returns:** `Translator<C>`.

**Example:**

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { save: 'Enregistrer' },
  { locale: 'fr' },
);

translator.translate('save');
```

| Method | Signature | Returns |
| --- | --- | --- |
| `translate` | `(textKey, options?)` or `(pluralKey, { count, ordinal?, values? })` | Rendered string |
| `translateDynamic` | `(key, options?)` | Rendered string for runtime key |
| `parts` | `(textKey, { values })` or `(pluralKey, { count, ordinal?, values? })` | Typed discriminated parts |
| `partsDynamic` | `(key, options)` | Parts for runtime key |
| `locale` | `Locale` | Resolved active locale |

---

### createI18n

```ts
function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C>;
```

Creates catalog store, current locale state, and immutable translator snapshots.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.catalogs` | `Catalogs<C>` | Eager locale catalogs; mutually exclusive with `state` |
| `options.locale` | `Locale` | Initial locale; defaults to serialized locale, then `en` |
| `options.loadCatalog` | `(locale) => Promise<C> \| C` | Optional loader for catalogs not supplied eagerly |
| `options.fallback` | `Locale \| readonly Locale[]` | Fallback locales loaded with the selected locale |
| `options.missing` | `MissingStrategy` | Missing-key/value strategy |
| `options.state` | `TranslationState<C>` | Eager serialized state; mutually exclusive with `catalogs` |

Provide `catalogs`, `state`, or `loadCatalog`. You may combine eager `catalogs` or hydrated `state` with `loadCatalog` for later locales.

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

| Method or property | Signature | Returns |
| --- | --- | --- |
| `translate` | Translator method | Rendered string |
| `parts` | Translator method | Typed discriminated parts |
| `load` | `({ locale? })` | `Promise<void>` after the locale and configured fallbacks load |
| `setLocale` | `(locale)` | `Promise<void>` after an atomic loaded-locale commit |
| `isLoaded` | `({ locale? })` | `boolean` |
| `getSnapshot` | `()` | `I18nSnapshot<C>` |
| `subscribe` | `(listener, { immediate?, signal? })` | Unsubscribe function |
| `serialize` | `()` | Loader-free `TranslationState<C>` |
| `dispose` | `()` | `void` |
| `locale` | `Locale` | Current canonical locale |
| `disposed` | `boolean` | Disposal state |
| `disposalSignal` | `AbortSignal` | Aborts on disposal |
| `[Symbol.dispose]` | `()` | Delegates to `dispose()` |

---

## Catalog Utilities

### catalogKeys

```ts
function catalogKeys<C extends Catalog>(source: I18n<C> | C): ReadonlyArray<MessageKey<C>>;
```

Enumerates every message key as a dotted path. Traverses nested grouping objects and explicit `{ plural: ... }` messages, producing the same paths that `TextKey<C>` represents at the type level. Pass an `I18n` instance to read from its current locale catalog; pass a raw catalog object to enumerate directly.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `I18n<C> \| C` | I18n instance (uses current locale) or raw catalog object |

**Returns:** `ReadonlyArray<MessageKey<C>>` — dotted paths to every text and plural message.

```ts
import { catalogKeys, createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: { en: { nav: { home: 'Home', settings: 'Settings' } } },
  locale: 'en',
});

const allKeys = catalogKeys(i18n); // ['nav.home', 'nav.settings']
const navKeys = catalogKeys(i18n.serialize().catalogs.en.nav); // ['home', 'settings']
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

### compareCatalogs

```ts
function compareCatalogs<C extends Catalog>(catalogs: Catalogs<C>): CatalogComparison;
```

Compares key sets across locales. First locale is the base — reports keys missing in each target and keys present in targets but absent from base. Validates each catalog structurally.

| Parameter | Type | Description |
| --- | --- | --- |
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

type TextPart = { readonly type: 'text'; readonly value: string };
type ValuePart<V> = { readonly type: 'value'; readonly value: V };
type Part<V> = TextPart | ValuePart<V>;

type MissingInfo = { readonly key: string; readonly locale: Locale; readonly name?: string };
type MissingHandler = (info: MissingInfo) => string;
type MissingStrategy = 'throw' | 'key' | MissingHandler;

type TranslatorOptions = { readonly locale?: Locale; readonly missing?: MissingStrategy };

type I18nOptions<C extends Catalog = Catalog> = {
  readonly fallback?: Locale | readonly Locale[];
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
} & (
  | { readonly catalogs: Catalogs<C>; readonly loadCatalog?: CatalogLoader<C>; readonly state?: never }
  | { readonly catalogs?: never; readonly loadCatalog?: CatalogLoader<C>; readonly state: TranslationState<C> }
  | { readonly catalogs?: never; readonly loadCatalog: CatalogLoader<C>; readonly state?: never }
);

type CatalogLoader<C extends Catalog> = (locale: Locale) => Promise<C> | C;

type TranslationState<C extends Catalog = Catalog> = {
  readonly catalogs: Catalogs<C>;
  readonly locale: Locale;
  readonly version: 4;
};

type I18nSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

type I18n<C extends Catalog = Catalog> = Translator<C> & {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): I18nSnapshot<C>;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): TranslationState<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (snapshot: I18nSnapshot<C>) => void, options?: SubscribeOptions): () => void;
  [Symbol.dispose](): void;
};

type Translator<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  parts<V>(key: TextKey<C>, options: TranslateOptions & { values: Record<string, V> }): Array<Part<V>>;
  parts<V>(key: PluralKey<C>, options: PluralOptions & { values?: Record<string, V> }): Array<Part<number | V>>;
  partsDynamic<V>(
    key: string,
    options: (TranslateOptions | PluralOptions) & { values?: Record<string, V> },
  ): Array<Part<number | V>>;
  translate(key: TextKey<C>, options?: TranslateOptions): string;
  translate(key: PluralKey<C>, options: PluralOptions): string;
  translateDynamic(key: string, options?: TranslateOptions | PluralOptions): string;
};
```

```ts
type Values = Record<string, unknown>;
type TranslateOptions = { values?: Values };
type PluralOptions = TranslateOptions & { count: number; ordinal?: boolean };
type SubscribeOptions = { immediate?: boolean; signal?: AbortSignal };

type MessageKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends string | PluralMessage
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: MessageKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

type TextKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends string
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: TextKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

type PluralKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends PluralMessage
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: PluralKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

type ValidationIssue = { key: string; locale: Locale; missing: Intl.LDMLPluralRule };
type CatalogComparison = {
  readonly missing: ReadonlyArray<{ key: string; locale: Locale }>;
  readonly extra: ReadonlyArray<{ key: string; locale: Locale }>;
};
```

## Errors

| Error | Trigger |
| --- | --- |
| `LinguaDisposedError` | State mutation or subscription after `dispose()` |
| `LinguaInvalidCatalogError` | Invalid catalog node or reserved key |
| `LinguaInvalidLocaleError` | Invalid BCP 47 locale tag |
| `LinguaInvalidPluralCountError` | Non-finite plural count |
| `LinguaInvalidStateError` | Unsupported serialized state version |
| `LinguaMissingCatalogError` | No `loadCatalog` function or catalog source unavailable |
| `LinguaMissingKeyError` | Missing translation key when `missing: 'throw'` |
| `LinguaMissingValueError` | Missing interpolation value when `missing: 'throw'` |
