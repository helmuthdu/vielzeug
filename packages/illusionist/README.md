# @vielzeug/illusionist

> Typed, deterministic, locale-aware fake data generator with seeded PRNG.

[![npm version](https://img.shields.io/npm/v/@vielzeug/illusionist)](https://www.npmjs.com/package/@vielzeug/illusionist) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```sh
pnpm add @vielzeug/illusionist
npm install @vielzeug/illusionist
yarn add @vielzeug/illusionist
```

## Quick Start

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 12345, locale: en });

illusion.person.fullName();      // "Ashley Harris"
illusion.internet.email();       // "samantha.sanchez@mail.com"
illusion.commerce.price();       // Money<USD>
illusion.date.past({ years: 5 }); // Temporal.ZonedDateTime
illusion.finance.iban();         // "IT0649896243786776403271206"
illusion.location.city();        // "Denver"
illusion.lorem.paragraph();      // "Dolor in fugiat anim dolor aute officia irure sunt..."
illusion.system.semver();        // "7.4.0"

illusion.dispose();              // [Symbol.dispose]() also works
```

## Entry Points

- `@vielzeug/illusionist` — curated root exports + `createIllusion` factory
- `@vielzeug/illusionist/person` — names, genders, job titles
- `@vielzeug/illusionist/internet` — emails, URLs, IPs, user agents
- `@vielzeug/illusionist/commerce` — product names, prices, departments
- `@vielzeug/illusionist/date` — past/future dates, birthdays, weekdays
- `@vielzeug/illusionist/finance` — IBANs, credit cards, crypto addresses
- `@vielzeug/illusionist/location` — cities, streets, coordinates
- `@vielzeug/illusionist/lorem` — lorem ipsum text generation
- `@vielzeug/illusionist/system` — file paths, semver, UUIDs, cron
- `@vielzeug/illusionist/seed` — `createSeed`, `mulberry32` PRNG
- `@vielzeug/illusionist/locales` — locale objects (`en`, `de`); tree-shakeable, import only what you use

## Seeded Determinism

Pass a `seed` for reproducible output — same seed always produces the same sequence across all categories. Omit `seed` for cryptographic randomness via `crypto.getRandomValues`.

```ts
const a = createIllusion({ seed: 'test-fixture', locale: en });
const b = createIllusion({ seed: 'test-fixture', locale: en });

a.person.fullName() === b.person.fullName(); // true
```

## Locale Support

Initial locales are explicit, tree-shakeable objects exported from `@vielzeug/illusionist/locales`. Locale data ships only for locales you import; the root package includes no default locale.

```ts
import { de } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 42, locale: de });

illusion.person.firstName();  // "Mathilda"
illusion.location.city();     // "Bielefeld"
```

For dynamic app switching, load the locale before creating the synchronous instance:

```ts
const { de } = await import('@vielzeug/illusionist/locales');
const illusion = createIllusion({ locale: de });
```

## Documentation

- [Overview](https://vielzeug.dev/illusionist/)
- [Usage Guide](https://vielzeug.dev/illusionist/usage)
- [API Reference](https://vielzeug.dev/illusionist/api)
- [Examples](https://vielzeug.dev/illusionist/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
