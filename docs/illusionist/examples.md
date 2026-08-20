---
title: Illusionist — Examples
description: Practical examples and recipes for @vielzeug/illusionist.
---

[[toc]]

## Generating Test Fixtures

Build a batch of realistic records from a fixed seed. The same seed reproduces the same fixtures in every run. For a full Vitest setup, see the [Test Fixtures recipe](./examples/test-fixtures.md).

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 'fixtures-v1', locale: en });

const users = Array.from({ length: 10 }, () => ({
  name: illusion.person.fullName(),
  email: illusion.internet.email(),
  address: illusion.location.streetAddress(),
  city: illusion.location.city(),
  zip: illusion.location.zipCode(),
}));

illusion.dispose();
```

## Seeded Test Data for Snapshot Testing

Use a named string seed so snapshot output is stable across CI runs. Each test creates its own instance to avoid cross-test random-state drift.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

test('order receipt snapshot', () => {
  const illusion = createIllusion({ seed: 'order-receipt', locale: en });

  const order = {
    customer: illusion.person.fullName(),
    product: illusion.commerce.productName(),
    price: illusion.commerce.price({ min: 5, max: 50 }),
    date: illusion.date.recent({ days: 7 }),
  };

  expect(order).toMatchInlineSnapshot();
  illusion.dispose();
});
```

## Locale-Specific Data (German)

Import the German locale object to draw names, cities, and weekday labels from its dataset.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { de } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 42, locale: de });

illusion.person.fullName();  // 'Mathilda Scholz'
illusion.location.city();    // 'Nürnberg'
illusion.location.zipCode(); // '15268'
illusion.date.weekday();     // 'Donnerstag'
illusion.date.month();       // 'März'

illusion.dispose();
```

## E-commerce Mock Data

Combine `person`, `commerce`, and `location` to build a consistent customer-order-shipping record. `commerce.price()` returns coins `Money`, so you can format it directly.

```ts
import { format } from '@vielzeug/coins';
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 'ecommerce-mock', locale: en });

const order = {
  customer: {
    name: illusion.person.fullName(),
    email: illusion.internet.email(),
  },
  item: illusion.commerce.productName(),
  price: illusion.commerce.price({ min: 20, max: 200, currency: 'EUR' }),
  shipping: {
    address: illusion.location.streetAddress(),
    city: illusion.location.city(),
    zip: illusion.location.zipCode(),
    country: illusion.location.country(),
  },
};

console.log(format(order.price, { locale: 'de-DE' }));
illusion.dispose();
```

## Database Seeding Pattern

Generate rows for a database seed script. Use a stable seed so the seed file is reproducible and reviewable.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

const illusion = createIllusion({ seed: 'db-seed-2024', locale: en });

const products = Array.from({ length: 50 }, () => ({
  name: illusion.commerce.productName(),
  department: illusion.commerce.department(),
  price: illusion.commerce.price({ min: 1, max: 500 }),
  description: illusion.commerce.productDescription(),
}));

const customers = Array.from({ length: 100 }, () => ({
  firstName: illusion.person.firstName(),
  lastName: illusion.person.lastName(),
  email: illusion.internet.email(),
  createdAt: illusion.date.past({ years: 2 }),
}));

illusion.dispose();
```

## Disposal in Long-Running Processes

Call `dispose()` when an instance is no longer needed. In long-running processes, use `using` to release instances automatically at scope exit.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';

function generateBatch(seed: number) {
  using illusion = createIllusion({ seed, locale: en });

  return Array.from({ length: 5 }, () => ({
    name: illusion.person.fullName(),
    email: illusion.internet.email(),
  }));
  // illusion.dispose() runs automatically at scope exit
}
```
