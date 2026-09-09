# @vielzeug/illusionist

> Typed, deterministic, locale-aware fake data generator with seeded PRNG

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
```

## Documentation

- [Overview](https://vielzeug.dev/illusionist/)
- [Usage Guide](https://vielzeug.dev/illusionist/usage)
- [API Reference](https://vielzeug.dev/illusionist/api)
- [Examples](https://vielzeug.dev/illusionist/examples)
- [Migration Guide](https://vielzeug.dev/illusionist/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
