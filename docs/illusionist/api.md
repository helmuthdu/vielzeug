---
title: Illusionist — API Reference
description: createIllusion, all category functions, seed utilities, types, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `createIllusion` | Create a bound, seeded instance | Sync | Locale is fixed for the instance lifetime |
| `person.*` | Names, gender, job titles | Sync | Locale-specific datasets (`en`, `de`) |
| `internet.*` | Emails, URLs, IPs, HTTP metadata | Sync | `ip()` defaults to IPv4 |
| `commerce.*` | Product names, prices | Sync | `price()` returns coins `Money` |
| `date.*` | Past, future, recent, birthday | Sync | Returns tempo `Temporal` objects |
| `finance.*` | IBANs, cards, crypto addresses | Sync | IBANs pass mod-97; cards pass Luhn |
| `location.*` | Cities, streets, GPS | Sync | Locale-specific datasets |
| `lorem.*` | Words, sentences, paragraphs | Sync | Word pool is fixed |
| `system.*` | Files, semver, UUIDs, ports | Sync | `port()` avoids well-known ports by default |
| `createSeed` | Build a `RandomSource` from a seed | Sync | Non-finite numeric seeds throw |
| `mulberry32` | Low-level 32-bit PRNG | Sync | Not cryptographically secure |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/illusionist` | `createIllusion`, `Illusionist`, `IllusionistOptions`, `IllusionistLocale`, error classes |
| `@vielzeug/illusionist/locales` | Tree-shakeable barrel — `en`, `de` locale objects |
| `@vielzeug/illusionist/locales/en` | English locale object only |
| `@vielzeug/illusionist/locales/de` | German locale object only |
| `@vielzeug/illusionist/seed` | `createSeed`, `mulberry32` |
| `@vielzeug/illusionist/person` | Person category functions |
| `@vielzeug/illusionist/internet` | Internet category functions |
| `@vielzeug/illusionist/commerce` | Commerce category functions |
| `@vielzeug/illusionist/date` | Date category functions |
| `@vielzeug/illusionist/finance` | Finance category functions |
| `@vielzeug/illusionist/location` | Location category functions |
| `@vielzeug/illusionist/lorem` | Lorem category functions |
| `@vielzeug/illusionist/system` | System category functions |

## createIllusion

```ts
function createIllusion(options: IllusionistOptions): Illusionist;
```

Creates a bound instance. All categories share one seeded random source and one locale. Locale data is included only when its dedicated subpath is imported; the root entry does not statically import a default locale. For dynamic switching, use `await import('@vielzeug/illusionist/locales')` before calling this synchronous factory.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `seed` | `number \| string` | `undefined` | Seed for deterministic output. Omit for cryptographic randomness. |
| `locale` | `IllusionistLocale` | Required | Explicit locale object for locale-aware categories. |

**Returns:** `Illusionist` — an object with `person`, `internet`, `commerce`, `date`, `finance`, `location`, `lorem`, `system` categories, plus `seed`, `locale`, `dispose()`, `disposed`, `disposalSignal`, and `[Symbol.dispose]()`.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 12345, locale: en });
illusion.person.fullName();
illusion.dispose();
```

---

## Person

### `person.firstName()`

```ts
function firstName(): string;
```

Returns a random first name from the locale dataset.

### `person.lastName()`

```ts
function lastName(): string;
```

Returns a random last name from the locale dataset.

### `person.fullName()`

```ts
function fullName(): string;
```

Returns a first and last name separated by a space.

### `person.gender()`

```ts
function gender(): string;
```

Returns a random gender label from the locale dataset.

### `person.prefix()`

```ts
function prefix(): string;
```

Returns a random name prefix (e.g. `Mr.`, `Dr.`).

### `person.suffix()`

```ts
function suffix(): string;
```

Returns a random name suffix. Returns an empty string when the locale dataset has no suffixes.

### `person.jobTitle()`

```ts
function jobTitle(): string;
```

Returns a job area and job type joined by a space.

---

## Internet

### `internet.email()`

```ts
function email(): string;
```

Returns an email of the form `firstname.lastname@domain.tld`.

### `internet.username()`

```ts
function username(): string;
```

Returns either a random alphanumeric string or a `firstname.lastname` pattern.

### `internet.password(options?)`

```ts
function password(options?: PasswordOptions): string;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `length` | `number` | `12` | Password length. |
| `memorable` | `boolean` | `false` | Build from name fragments and digits. |

Returns a password mixing upper/lowercase letters, digits, and special characters.

### `internet.url()`

```ts
function url(): string;
```

Returns a URL of the form `protocol://sub.domain.tld/path/...`.

### `internet.domainName()`

```ts
function domainName(): string;
```

Returns a domain of the form `domain.tld`.

### `internet.ip(version?)`

```ts
function ip(version?: 4 | 6): string;
```

Returns an IPv4 or IPv6 address. Defaults to IPv4.

### `internet.mac()`

```ts
function mac(): string;
```

Returns a MAC address of the form `XX:XX:XX:XX:XX:XX`.

### `internet.userAgent()`

```ts
function userAgent(): string;
```

Returns a random user agent string.

### `internet.httpMethod()`

```ts
function httpMethod(): string;
```

Returns a random HTTP method.

### `internet.statusCode()`

```ts
function statusCode(): number;
```

Returns a random HTTP status code.

### `internet.mimeType()`

```ts
function mimeType(): string;
```

Returns a random MIME type.

---

## Commerce

### `commerce.productAdjective()`

```ts
function productAdjective(): string;
```

Returns a random product adjective.

### `commerce.productMaterial()`

```ts
function productMaterial(): string;
```

Returns a random product material.

### `commerce.productNoun()`

```ts
function productNoun(): string;
```

Returns a random product noun.

### `commerce.productName()`

```ts
function productName(): string;
```

Returns an adjective, material, and noun joined by spaces.

### `commerce.department()`

```ts
function department(): string;
```

Returns a random department name.

### `commerce.price(options?)`

```ts
function price(options?: PriceOptions): Money;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `min` | `number` | `0.01` | Minimum price. |
| `max` | `number` | `1000` | Maximum price. |
| `currency` | `'USD' \| 'EUR' \| 'GBP'` | `'USD'` | Currency code. |

Returns a coins `Money` value with two decimal places.

### `commerce.productDescription()`

```ts
function productDescription(): string;
```

Returns one or two sentences describing a product.

---

## Date

All date functions return tempo `Temporal` objects.

### `date.past(options?)`

```ts
function past(options?: { years?: number; ref?: Temporal.ZonedDateTime }): Temporal.ZonedDateTime;
```

Returns a date in the past within `years` (default `1`) from `ref` (default now).

### `date.future(options?)`

```ts
function future(options?: { years?: number; ref?: Temporal.ZonedDateTime }): Temporal.ZonedDateTime;
```

Returns a date in the future within `years` (default `1`) from `ref` (default now).

### `date.recent(options?)`

```ts
function recent(options?: { days?: number; ref?: Temporal.ZonedDateTime }): Temporal.ZonedDateTime;
```

Returns a date within `days` (default `1`) in the past from `ref` (default now).

### `date.between(from, to)`

```ts
function between(from: Temporal.ZonedDateTime, to: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
```

Returns a date between `from` and `to`. Returns `from` if `from` is after `to`.

### `date.birthday(options?)`

```ts
function birthday(options?: { minAge?: number; maxAge?: number; ref?: Temporal.ZonedDateTime }): Temporal.PlainDate;
```

Returns a `PlainDate` with a random age between `minAge` (default `18`) and `maxAge` (default `80`).

### `date.weekday(locale?)`

```ts
function weekday(locale?: string): string;
```

Returns a random weekday name. Uses the instance locale unless overridden.

### `date.month(locale?)`

```ts
function month(locale?: string): string;
```

Returns a random month name. Uses the instance locale unless overridden.

---

## Finance

### `finance.amount(options?)`

```ts
function amount(options?: AmountOptions): Money;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `min` | `number` | `100` | Minimum amount. |
| `max` | `number` | `10000` | Maximum amount. |
| `currency` | `'USD' \| 'EUR' \| 'GBP'` | `'USD'` | Currency code. |

Returns a coins `Money` value with two decimal places.

### `finance.iban(countryCode?)`

```ts
function iban(countryCode?: string): string;
```

Returns an IBAN. Pass a country code to fix the country; otherwise a random supported country is chosen. The check digits are computed so the IBAN passes mod-97 validation.

### `finance.bic()`

```ts
function bic(): string;
```

Returns a BIC/SWIFT code of 8 or 11 characters.

### `finance.creditCardNumber(type?)`

```ts
function creditCardNumber(type?: 'visa' | 'mastercard' | 'amex'): string;
```

Returns a card number with a valid Luhn check digit. Amex returns 15 digits; others return 16.

### `finance.creditCardCVV(type?)`

```ts
function creditCardCVV(type?: 'visa' | 'mastercard' | 'amex'): string;
```

Returns a CVV. Amex returns 4 digits; others return 3.

### `finance.bitcoinAddress()`

```ts
function bitcoinAddress(): string;
```

Returns a Bitcoin address with a `1`, `3`, or `bc1` prefix.

### `finance.ethereumAddress()`

```ts
function ethereumAddress(): string;
```

Returns a 42-character Ethereum address prefixed with `0x`.

### `finance.transactionType()`

```ts
function transactionType(): string;
```

Returns a random transaction type label.

### `finance.bank()`

```ts
function bank(): string;
```

Returns a random bank name.

---

## Location

### `location.city()`

```ts
function city(): string;
```

Returns a random city from the locale dataset.

### `location.street()`

```ts
function street(): string;
```

Returns a random street from the locale dataset.

### `location.streetAddress()`

```ts
function streetAddress(): string;
```

Returns a house number (1–999) followed by a street name.

### `location.zipCode()`

```ts
function zipCode(): string;
```

Returns a ZIP code matching the locale's pattern.

### `location.state()`

```ts
function state(): string;
```

Returns a random state or region from the locale dataset.

### `location.country()`

```ts
function country(): string;
```

Returns a random country from the locale dataset.

### `location.latitude()`

```ts
function latitude(): number;
```

Returns a latitude in the range `[-90, 90]`.

### `location.longitude()`

```ts
function longitude(): number;
```

Returns a longitude in the range `[-180, 180]`.

### `location.nearbyGPSCoordinate(ref?)`

```ts
function nearbyGPSCoordinate(ref?: Coordinate): Coordinate;
```

Returns a coordinate within ~1 degree of `ref`. When `ref` is omitted, a random coordinate is used as the base.

---

## Lorem

### `lorem.word()`

```ts
function word(): string;
```

Returns a single random word.

### `lorem.words(count?)`

```ts
function words(count?: number): string;
```

Returns `count` (default `3`) space-joined words.

### `lorem.sentence(wordCount?)`

```ts
function sentence(wordCount?: number): string;
```

Returns a sentence of `wordCount` words (default 6–12) with a capital first letter and trailing period.

### `lorem.sentences(count?)`

```ts
function sentences(count?: number): string;
```

Returns `count` (default `3`) space-joined sentences.

### `lorem.paragraph(sentenceCount?)`

```ts
function paragraph(sentenceCount?: number): string;
```

Returns a paragraph of `sentenceCount` sentences (default 3–7).

### `lorem.paragraphs(count?)`

```ts
function paragraphs(count?: number): string;
```

Returns `count` (default `3`) newline-joined paragraphs.

### `lorem.slug(wordCount?)`

```ts
function slug(wordCount?: number): string;
```

Returns a hyphen-joined slug of `wordCount` (default `3`) words.

### `lorem.lines(count?)`

```ts
function lines(count?: number): string;
```

Returns `count` (default `5`) newline-joined lines, each a sentence.

---

## System

### `system.fileExtension()`

```ts
function fileExtension(): string;
```

Returns a random file extension.

### `system.fileName()`

```ts
function fileName(): string;
```

Returns a random file name with extension.

### `system.filePath()`

```ts
function filePath(): string;
```

Returns a path with 1–4 directory segments and a file name.

### `system.mimeType()`

```ts
function mimeType(): string;
```

Returns a random MIME type.

### `system.semver(options?)`

```ts
function semver(options?: { maxMajor?: number; includePrerelease?: boolean }): string;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxMajor` | `number` | `20` | Maximum major version. |
| `includePrerelease` | `boolean` | `false` | Occasionally append a prerelease label. |

Returns a semver string.

### `system.uuid()`

```ts
function uuid(): string;
```

Returns a random UUID via `crypto.randomUUID()`. **Not deterministic** — ignores the seeded `RandomSource`. Use only when uniqueness matters more than reproducibility.

### `system.port(options?)`

```ts
function port(options?: { min?: number; max?: number }): number;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `min` | `number` | `1024` | Minimum port. |
| `max` | `number` | `65535` | Maximum port. |

Returns a random port number.

### `system.cron()`

```ts
function cron(): string;
```

Returns a random cron expression from common patterns.

### `system.process()`

```ts
function process(): string;
```

Returns a random process name of the form `prefix_suffix`.

---

## Seed

Import from the `seed` subpath:

```ts
import { createSeed, mulberry32 } from '@vielzeug/illusionist/seed';
```

### `createSeed(seed?)`

```ts
function createSeed(seed?: number | string): RandomSource;
```

Creates a `RandomSource` from a seed. Number seeds are used directly as mulberry32 state. String seeds are hashed to a 32-bit integer. Omit the seed for cryptographic randomness via `crypto.getRandomValues`. Throws `IllusionistSeedError` for non-finite numeric seeds.

```ts
const a = createSeed(12345);    // deterministic
const b = createSeed('hello');  // deterministic (hashed)
const c = createSeed();         // cryptographic
```

### `mulberry32(seed)`

```ts
function mulberry32(seed: number): RandomSource;
```

Low-level 32-bit PRNG. Not cryptographically secure. Returns a `RandomSource` producing floats in `[0, 1)`.

---

## Types

```ts
type PersonLocaleData = {
  readonly firstNameFemale: readonly string[];
  readonly firstNameMale: readonly string[];
  readonly gender: readonly string[];
  readonly jobAreas: readonly string[];
  readonly jobTypes: readonly string[];
  readonly lastName: readonly string[];
  readonly prefix: readonly string[];
  readonly suffix: readonly string[];
};

type LocationLocaleData = {
  readonly cities: readonly string[];
  readonly countries: readonly string[];
  readonly states: readonly string[];
  readonly streets: readonly string[];
  readonly zipPattern: string;
};

type IllusionistLocale = {
  readonly code: string;
  readonly person: PersonLocaleData;
  readonly location: LocationLocaleData;
};

type IllusionistOptions = {
  seed?: number | string;
  locale: IllusionistLocale;
};

type Illusionist = {
  readonly person: typeof person;
  readonly internet: typeof internet;
  readonly commerce: typeof commerce;
  readonly date: typeof date;
  readonly finance: typeof finance;
  readonly location: typeof location;
  readonly lorem: typeof lorem;
  readonly system: typeof system;
  readonly seed: number | string | undefined;
  readonly locale: IllusionistLocale;
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
};

type Coordinate = {
  lat: number;
  lng: number;
};

type PasswordOptions = {
  length?: number;
  memorable?: boolean;
};

type PriceOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly currency?: 'USD' | 'EUR' | 'GBP';
};

type AmountOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly currency?: 'USD' | 'EUR' | 'GBP';
};

// Re-exported from @vielzeug/arsenal
type RandomSource = {
  next(): number; // float in [0, 1)
};
```

## Errors

All errors extend `IllusionistError`, which extends `Error`. Use `instanceof IllusionistError` to catch any illusionist-originated error.

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `IllusionistError` | Base class for all illusionist errors | `name`, `message` |
| `IllusionistSeedError` | Non-finite numeric seed passed to `createSeed` (`NaN`, `Infinity`, `-Infinity`) | `name`, `message` |

```ts
import { IllusionistError, IllusionistSeedError, createSeed } from '@vielzeug/illusionist';

try {
  createSeed(Number.NaN);
} catch (error) {
  if (error instanceof IllusionistSeedError) {
    console.log(error.message);
  }
}
```
