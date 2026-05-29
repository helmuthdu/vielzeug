---
description: Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.
package: sieve
category: validation
keywords: [schema, validation, type-safe, parsing, runtime-validation, zod-like, coercion]
related: [forge, courier, deposit]
exports: [s, toJsonSchema, ValidationError, configure]
---

# /sieve

> Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.

[![npm version](https://img.shields.io/npm/v//sieve)](https://www.npmjs.com/package//sieve) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/sieve` &nbsp;·&nbsp; **Category:** Validation

**Key exports:** `v`, `toJsonSchema`, `ValidationError`, `configure`

**When to use:** Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.

**Related:** [@vielzeug/forge](https://vielzeug.dev/forge/) · [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/deposit](https://vielzeug.dev/deposit/)

</details>

`/sieve` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /sieve
npm install /sieve
yarn add /sieve
```

## Quick Start

```ts
import { flattenFirstErrors, s, type Infer } from '/sieve';

const UserSchema = s.object({
  id: s.coerce.number().int().positive(),
  name: s.string().trim().min(1),
  email: s.string().trim().email(),
  role: s.union('admin', 'editor', 'viewer').default('viewer'),
  tags: s.array(s.string()).unique().default([]),
});

type User = Infer<typeof UserSchema>;

const result = UserSchema.safeParse({ id: '42', name: 'Ada', email: 'ada@example.com' });

if (result.success) {
  const user: User = result.data;
  console.log(user.id); // 42
} else {
  console.log(flattenFirstErrors(result.error));
}
```

## Documentation

- [Overview](https://vielzeug.dev/sieve/)
- [Usage Guide](https://vielzeug.dev/sieve/usage)
- [API Reference](https://vielzeug.dev/sieve/api)
- [Examples](https://vielzeug.dev/sieve/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
