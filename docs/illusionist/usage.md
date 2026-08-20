---
title: Illusionist — Usage Guide
description: Generate deterministic, locale-aware fake data with Illusionist.
---

[[toc]]

## Basic Usage

Create an illusionist instance with `createIllusion`. Access data through the eight bound categories. Each call consumes from the shared random source, so output is deterministic for a given seed.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 12345, locale: en });

illusion.person.firstName();       // 'Ashley'
illusion.internet.username();      // 'fVEv9zc638m'
illusion.commerce.productName();   // 'Intelligent Granite Table'
illusion.date.recent({ days: 7 }); // Temporal.ZonedDateTime within the last week
illusion.lorem.sentence();         // 'Enim ex non ea minim amet sint laborum proident nisi anim officia.'

illusion.dispose();
```

## Seeded Determinism

Pass a number or string seed to make output reproducible. The same seed always produces the same sequence across runs, machines, and Node versions.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const a = createIllusion({ seed: 12345, locale: en });
const b = createIllusion({ seed: 12345, locale: en });

a.person.fullName() === b.person.fullName(); // true

const c = createIllusion({ seed: 'my-test-suite', locale: en });
const d = createIllusion({ seed: 'my-test-suite', locale: en });

c.internet.email() === d.internet.email(); // true — string seeds are hashed
```

Omit the seed for cryptographic randomness backed by `crypto.getRandomValues`. Output is then non-deterministic and unsuitable for snapshots.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const random = createIllusion({ locale: en });
random.person.fullName(); // different every run
```

## Locale Support

Import a locale object and pass it at creation time. The `person` and `location` categories draw from that object's datasets. The `date.weekday` and `date.month` functions use its locale code.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { de, en } from '@vielzeug/illusionist/locales';

const english = createIllusion({ seed: 1, locale: en });
const german = createIllusion({ seed: 1, locale: de });

english.person.firstName(); // 'Mary'
german.person.firstName();  // 'Mia'

english.location.city(); // 'Austin'
german.location.city();  // 'Bremen'

english.date.month(); // 'December'
german.date.month();  // 'Dezember'
```

The locale is fixed for the lifetime of an instance. Each locale is a separate subpath, so locale data ships only when that subpath is imported; the root package does not statically include English or German data. Create a new instance to switch locales.

For dynamic app switching, load the desired locale before calling the synchronous factory:

```ts
const { de } = await import('@vielzeug/illusionist/locales/de');
const german = createIllusion({ locale: de });
```

### Custom Locales

The shipped `en` and `de` objects are just plain data that `satisfies IllusionistLocale`. Build your own the same way — import the type, assemble the `person` and `location` datasets, and pass the result to `createIllusion`. No registration step; the factory accepts any object that matches the shape.

```ts
import { createIllusion, type IllusionistLocale } from '@vielzeug/illusionist';

const fr: IllusionistLocale = {
  code: 'fr',
  person: {
    firstNameFemale: ['Marie', 'Camille', 'Sophie'],
    firstNameMale: ['Louis', 'Hugo', 'Léo'],
    lastName: ['Martin', 'Bernard', 'Dubois'],
    gender: ['féminin', 'masculin', 'non-binaire'],
    jobAreas: ['marketing', 'ingénierie', 'ventes'],
    jobTypes: ['directeur', 'ingénieur', 'analyste'],
    prefix: ['M.', 'Mme', 'Dr.'],
    suffix: ['PhD', 'Jr.'],
  },
  location: {
    cities: ['Paris', 'Lyon', 'Marseille'],
    countries: ['France', 'Belgique', 'Suisse'],
    states: ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur'],
    streets: ['rue de la Paix', 'avenue des Champs-Élysées', 'boulevard Saint-Germain'],
    zipPattern: '#####',
  },
};

const illusion = createIllusion({ seed: 42, locale: fr });

illusion.person.fullName();    // 'Camille Dubois'
illusion.location.city();      // 'Marseille'
illusion.person.jobTitle();    // 'marketing ingénieur'
```

`date.weekday()` and `date.month()` currently ship English and German name arrays only; a custom locale code falls through to the English set. For other languages, format a generated `Temporal` date with `@vielzeug/tempo`'s `format()` and your own `Intl.DateTimeFormat` options.

Use `satisfies IllusionistLocale` instead of a bare type annotation to get error locality — TypeScript points at the offending field rather than the whole object.

## Category Overview

| Category | Example call                        | Returns |
| --- |-------------------------------------| --- |
| `person` | `illusion.person.fullName()`        | `string` |
| `internet` | `illusion.internet.email()`         | `string` |
| `commerce` | `illusion.commerce.price()`         | `Money` (coins) |
| `date` | `illusion.date.past({ years: 1 })`  | `Temporal.ZonedDateTime` (tempo) |
| `finance` | `illusion.finance.iban()`           | `string` |
| `location` | `illusion.location.streetAddress()` | `string` |
| `lorem` | `illusion.lorem.paragraph()`        | `string` |
| `system` | `illusion.system.uuid()`            | `string` |

## Working with Other Vielzeug Libraries

Illusionist integrates with other Vielzeug packages at the return-type level. `commerce.price()` and `finance.amount()` return coins `Money`, so you can format, add, or allocate them directly. `date` functions return tempo `Temporal` objects, so you can shift, compare, or format them.

```ts
import { format, add, money } from '@vielzeug/coins';
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';
import { formatZonedDateTimeISO } from '@vielzeug/tempo';

const illusion = createIllusion({ seed: 42, locale: en });

const price = illusion.commerce.price({ min: 10, max: 50, currency: 'EUR' });
const tax = money('5.00', price.currency);
const total = add(price, tax);

console.log(format(total, { locale: 'de-DE' }));

const orderDate = illusion.date.recent({ days: 30 });
console.log(formatZonedDateTimeISO(orderDate));
```

## Best Practices

- Pass a seed in tests and CI; omit it only for one-off non-reproducible mocks.
- Create one instance per test case so each test starts from a known random state.
- Call `dispose()` (or use `using`) when an instance is no longer needed, especially in long-running processes.
- Fix the locale at creation time; create a new instance to switch locales rather than mixing.
- Use string seeds for named test suites — they are self-documenting and hash to a stable number.
- Combine `person`, `internet`, and `location` to build internally consistent mock entities.
- Treat `Money` and `Temporal` return values as first-class — pass them to coins and tempo functions directly.
- Avoid sharing a single instance across concurrent async tasks; each call advances the shared random source.
- `system.uuid()` uses `crypto.randomUUID()`, not the seeded source. Do not use it in deterministic fixtures or snapshot tests.
