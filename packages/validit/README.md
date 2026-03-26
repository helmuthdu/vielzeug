# @vielzeug/validit

> Composable, type-safe schema validation with sync/async parsing and full TypeScript inference.

[![npm version](https://img.shields.io/npm/v/@vielzeug/validit)](https://www.npmjs.com/package/@vielzeug/validit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/validit` is a lightweight validation library for runtime data checks with a fluent API and precise TypeScript output types.

## Installation

```sh
pnpm add @vielzeug/validit
# npm install @vielzeug/validit
# yarn add @vielzeug/validit
```

## Quick Start

```ts
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v
  .object({
    id: v.coerce.number().int().positive(),
    name: v.string().min(1),
    email: v.string().trim().email(),
    role: v.union('admin', 'editor', 'viewer').default('viewer'),
  })
  .strict();

type User = Infer<typeof UserSchema>;

const result = UserSchema.safeParse({ id: '42', name: 'Ada', email: 'ada@example.com' });

if (result.success) {
  const user: User = result.data;
  console.log(user.id); // 42
} else {
  console.log(result.error.flatten());
}
```

## Features

- Chainable schema API for primitive and composite types
- Full output type inference via `Infer<T>` / `InferOutput<T>`
- Sync and async custom rules with `.refine()` / `.refineAsync()`
- Built-in coercion via `v.coerce.string|number|boolean|date`
- Object helpers: `.partial()`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strict()`
- Union options: `v.union()`, `v.intersect()`, and discriminated `v.variant()`
- Configurable global messages via `configure({ messages })`
- Structured errors with `ValidationError`, `Issue`, and `error.flatten()`
- Zero dependencies

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@vielzeug/validit` | `v` namespace, `Schema`, errors, and type utilities |

## Usage Highlights

### `refine` vs `refineAsync`

```ts
const PasswordSchema = v
  .string()
  .min(8)
  .refine((value) => /[A-Z]/.test(value), 'Must contain an uppercase letter');

const UniqueEmailSchema = v.string().email().refineAsync(async (value) => {
  const exists = await db.users.exists({ email: value });
  return !exists;
}, 'Email already in use');

PasswordSchema.parse('Hello123');
await UniqueEmailSchema.parseAsync('a@b.com');
```

### Global Message Customization

```ts
import { configure, v } from '@vielzeug/validit';

configure({
  messages: {
    enum_invalid: ({ values }) => `Pick one of: ${values.join(', ')}`,
    string_email: () => 'Please provide a valid email address',
    variant_type: () => 'Expected payload object',
  },
});

const Account = v.object({
  email: v.string().email(),
  plan: v.union('free', 'pro'),
});
```

## API At A Glance

- `v` namespace: `string`, `number`, `boolean`, `date`, `literal`, `enum`, `nativeEnum`, `object`, `array`, `tuple`, `record`, `union`, `intersect`, `variant`, `lazy`, `instanceof`, `never`, `any`, `unknown`, `null`, `undefined`
- Base schema methods: `parse`, `safeParse`, `parseAsync`, `safeParseAsync`, `optional`, `nullable`, `nullish`, `required`, `default`, `catch`, `refine`, `refineAsync`, `transform`, `preprocess`, `describe`, `brand`, `is`
- Errors and types: `ValidationError`, `ErrorCode`, `Issue`, `ParseResult<T>`, `MessageFn<Ctx>`, `Infer<T>`

## Documentation

- [Overview](https://vielzeug.dev/validit/)
- [Usage Guide](https://vielzeug.dev/validit/usage)
- [API Reference](https://vielzeug.dev/validit/api)
- [Examples](https://vielzeug.dev/validit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) - part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
