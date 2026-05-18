---
description: Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.
package: validit
category: validation
keywords: [schema, validation, type-safe, parsing, runtime-validation, zod-like, coercion]
related: [formit, fetchit, deposit]
exports: [v, toJsonSchema, ValidationError, configure]
---

# @vielzeug/validit

> Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.

[![npm version](https://img.shields.io/npm/v/@vielzeug/validit)](https://www.npmjs.com/package/@vielzeug/validit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/validit` &nbsp;·&nbsp; **Category:** Validation

**Key exports:** `v`, `toJsonSchema`, `ValidationError`, `configure`

**When to use:** Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.

**Related:** [@vielzeug/formit](https://vielzeug.dev/formit/) · [@vielzeug/fetchit](https://vielzeug.dev/fetchit/) · [@vielzeug/deposit](https://vielzeug.dev/deposit/)

</details>

`@vielzeug/validit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/validit
npm install @vielzeug/validit
yarn add @vielzeug/validit
```

## Quick Start

```ts
import { flattenFirstErrors, v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  id: v.coerce.number().int().positive(),
  name: v.string().trim().min(1),
  email: v.string().trim().email(),
  role: v.union('admin', 'editor', 'viewer').default('viewer'),
  tags: v.array(v.string()).unique().default([]),
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

- [Overview](https://vielzeug.dev/validit/)
- [Usage Guide](https://vielzeug.dev/validit/usage)
- [API Reference](https://vielzeug.dev/validit/api)
- [Examples](https://vielzeug.dev/validit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
