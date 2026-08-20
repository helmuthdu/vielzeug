---
title: Illusionist — Fake Data Generator for TypeScript
description: Typed, deterministic, locale-aware fake data generator with a seeded PRNG, eight data categories, and zero external runtime dependencies.
package: illusionist
category: data
keywords: [fake-data, mock, seed, faker, test-fixtures, deterministic]
exports: [createIllusion, createSeed, mulberry32]
related: [arsenal, coins, tempo]
environments: [browser, node, ssr]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="illusionist" />

## Why Illusionist?

Illusionist generates realistic fake data from a single seeded random source. The same seed always produces the same output, so test fixtures and snapshots stay reproducible across runs, machines, and CI. Every category shares one bound instance with one locale, so a person, their email, and their address stay internally consistent.

```ts
// Before
const user = {
  name: 'Test User',
  email: 'test@example.com',
  address: '123 Main St',
};

// After
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 12345, locale: en });

const user = {
  name: illusion.person.fullName(),
  email: illusion.internet.email(),
  address: illusion.location.streetAddress(),
};

illusion.dispose();
```

| Feature | Illusionist | Faker.js | @faker-js/faker |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="illusionist" type="size" /> | External dependency | External dependency |
| Zero external dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Seeded determinism | <ore-icon name="check" size="16"></ore-icon> | Partial | <ore-icon name="check" size="16"></ore-icon> |
| Locale-aware datasets | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| TypeScript-native types | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Illusionist when** test fixtures, mock APIs, or database seeds must be realistic and reproducible from a single seed value.

**Consider @faker-js/faker when** you need a large catalog of locale datasets beyond `en` and `de` or a community plugin ecosystem.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/illusionist
```

```sh [npm]
npm install @vielzeug/illusionist
```

```sh [yarn]
yarn add @vielzeug/illusionist
```

:::

## Quick Start

Create a bound instance with a seed and locale. All categories share that seed, so output is deterministic.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 12345, locale: en });

illusion.person.fullName();        // 'Ashley Harris'
illusion.internet.email();         // 'samantha.sanchez@mail.com'
illusion.commerce.price();         // Money { amount: 76640n, currency: USD }
illusion.date.past({ years: 2 });  // Temporal.ZonedDateTime

illusion.dispose();                // release the instance; [Symbol.dispose]() also works
```

## Features

<div class="features-grid">

- **`person`**: names, gender, prefixes, suffixes, job titles
- **`internet`**: emails, usernames, passwords, URLs, IPs, MACs, HTTP metadata
- **`commerce`**: product names, departments, prices as coins `Money`
- **`date`**: past, future, recent, between, birthday as tempo `Temporal` objects
- **`finance`**: amounts, IBANs, BICs, credit cards, crypto addresses
- **`location`**: cities, streets, states, countries, GPS coordinates
- **`lorem`**: words, sentences, paragraphs, slugs
- **`system`**: file paths, semver, UUIDs, ports, cron expressions

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — random primitives (`RandomSource`, `uuid`) that Illusionist builds on.
- [Coins](/coins/) — exact money type returned by `commerce.price()` and `finance.amount()`.
- [Tempo](/tempo/) — `Temporal` date utilities returned by every `date` function.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
