# @vielzeug/spell

> Zero-dependency schema validation library with strict-by-default objects, unified sync/async `validate()`, coercion, flexible schema composition, and full TypeScript inference.

[![npm version](https://img.shields.io/npm/v/@vielzeug/spell)](https://www.npmjs.com/package/@vielzeug/spell) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/spell` &nbsp;·&nbsp; **Category:** Validation

**Key exports:** `s`, `SpellValidationError`, `setMessages`, `setLogger`, `resetMessages`, `createParseContext`, `withMessages`, `withLogger`, `ErrorCode`, `errorsAt`, `descriptorToJsonSchema`

**When to use:** Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.

**Related:** [@vielzeug/forge](https://vielzeug.dev/forge/) · [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/vault](https://vielzeug.dev/vault/)

</details>

`@vielzeug/spell` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/spell
npm install @vielzeug/spell
yarn add @vielzeug/spell
```

## Quick Start

```ts
import { s, type Infer } from '@vielzeug/spell';

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

  // Assertion form — narrows type, throws SpellValidationError on failure
  UserSchema.assert(result.data, 'user');
} else {
  const { fieldErrors, formErrors } = result.error.flattenFirst();
  console.log(fieldErrors, formErrors);
}
```

## Documentation

- [Overview](https://vielzeug.dev/spell/)
- [Usage Guide](https://vielzeug.dev/spell/usage)
- [API Reference](https://vielzeug.dev/spell/api)
- [Examples](https://vielzeug.dev/spell/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
