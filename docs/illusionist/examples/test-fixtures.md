---
title: 'Illusionist Examples — Seeded Test Fixtures'
description: Use a seeded Illusionist instance to generate reproducible Vitest test fixtures.
---

## Seeded Test Fixtures for Vitest

### Problem

Test suites need realistic mock data that stays stable across runs so snapshots and assertions do not flake in CI. Hand-written fixtures drift from real shapes; unseeded random generators produce different output every run.

APIs involved: `createIllusion`, `person`, `internet`, `location`, `system`.

### Solution

Create a seeded illusionist instance inside each test. The same seed reproduces the same data in every run.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';
import { describe, expect, test } from 'vitest';

function makeUser(seed: number) {
  const illusion = createIllusion({ seed, locale: en });

  const user = {
    name: illusion.person.fullName(),
    email: illusion.internet.email(),
    address: illusion.location.streetAddress(),
    city: illusion.location.city(),
    zip: illusion.location.zipCode(),
  };

  return user;
}

describe('user profile', () => {
  test('generates a valid user', () => {
    const user = makeUser(12345);

    expect(user.name).toContain(' ');
    expect(user.email).toContain('@');
  });

  test('is deterministic for the same seed', () => {
    const a = makeUser(12345);
    const b = makeUser(12345);

    expect(a).toEqual(b);
  });

  test('snapshot stays stable', () => {
    const user = makeUser(12345);

    expect(user).toMatchInlineSnapshot();
  });
});
```

#### With per-test isolation

Give each test a distinct seed so failures point to a specific case. Instances own no external resources, so ordinary block scope provides isolation.

```ts
import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';
import { describe, expect, test } from 'vitest';

describe('orders', () => {
  test.each([1, 2, 3])('order #%s', (seed) => {
    const illusion = createIllusion({ seed, locale: en });

    const order = {
      customer: illusion.person.fullName(),
      product: illusion.commerce.productName(),
      price: illusion.commerce.price({ min: 10, max: 100 }),
    };

    expect(order.price.amount).toBeGreaterThan(0n);
  });
});
```

### Pitfalls

- Do not share a single instance across tests that run concurrently — each call advances the shared random source and causes cross-test drift.
- Create a fresh instance per test when each test must begin from the start of its seed sequence.
- The same string seed always produces the same sequence. Different strings can theoretically collide because seeds are folded to 32 bits.
- `system.uuid()` uses `crypto.randomUUID()`, not the seeded source. Do not use it in deterministic fixtures or snapshot tests.

### Related

- [Usage Guide — Seeded Determinism](../usage.md#seeded-determinism)
- [API Reference — createIllusion](../api.md#createillusion)
- [Examples — Snapshot Testing](../examples.md#seeded-test-data-for-snapshot-testing)
