# @vielzeug/validit

> Zero-dependency schema validation for TypeScript with strict objects, async refinements, coercion, and precise output inference.

[![npm version](https://img.shields.io/npm/v/@vielzeug/validit)](https://www.npmjs.com/package/@vielzeug/validit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/validit` is a lightweight schema validation library for parsing unknown input into trusted application data. It combines a fluent runtime API with precise TypeScript output types.

## Installation

```sh
pnpm add @vielzeug/validit
# npm install @vielzeug/validit
# yarn add @vielzeug/validit
```

## Quick Start

```ts
import { v, type Infer } from '@vielzeug/validit';

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
  console.log(result.error.flattenFirst());
}
```

## Features

- Strict-by-default objects with `.relaxed()` for explicit passthrough behavior
- Primitive, collection, union, intersection, enum, lazy, and variant schema factories
- Full output inference via `Infer<T>`, `InferOutput<T>`, and `TypeOf<T>`
- Sync and async custom rules with `.refine()` and `.refineAsync()`
- Built-in coercion via `v.coerce.string()`, `v.coerce.number()`, `v.coerce.boolean()`, and `v.coerce.date()`
- Default, fallback, preprocess, transform, branding, and runtime type-guard helpers
- Nested global message configuration via `configure({ messages })` plus `reset()`
- Structured errors with `ValidationError`, `Issue`, `error.flatten()`, and `error.flattenFirst()`
- Zero dependencies

## Core API

### Factories

- `v.any()`
- `v.unknown()`
- `v.string()`
- `v.number()`
- `v.boolean()`
- `v.date()`
- `v.literal(value)`
- `v.enum(values)`
- `v.nativeEnum(enumObj)`
- `v.object(shape)`
- `v.array(itemSchema)`
- `v.tuple(items)`
- `v.record(keySchema, valueSchema)`
- `v.union(...branches)`
- `v.intersect(...branches)`
- `v.variant(discriminator, map)`
- `v.lazy(getter)`
- `v.instanceof(Ctor)`
- `v.never()`, `v.null()`, `v.undefined()`

### Validation flow

- `parse(value)` throws `ValidationError` on failure
- `safeParse(value)` returns `{ success, data | error }`
- `parseAsync(value)` and `safeParseAsync(value)` run async refinements
- `refineAsync()` requires the async parse methods

### Common modifiers

- `optional()`, `nullable()`, `nullish()`, `required()`
- `default(value)` applies when the input is `undefined`
- `catch(value)` returns a fallback on validation failure
- `preprocess(fn)` runs before validation
- `transform(fn)` runs after successful parsing

When multiple preprocessors are chained, they run in declaration order.

## Message customization

Validit uses nested message groups instead of flat keys.

```ts
import { configure, reset } from '@vielzeug/validit';

configure({
  messages: {
    number: {
      min: ({ min }) => `Value must be at least ${min}`,
    },
    string: {
      email: () => 'Please enter a valid email address',
      ip: () => 'Use a valid IPv4 or IPv6 address',
    },
  },
});

reset();
```

## Usage Highlights

### Strict object parsing

```ts
const Payload = v.object({
  id: v.number().int().positive(),
  email: v.string().email(),
});

Payload.safeParse({ id: 1, email: 'a@b.com', extra: true });
// => failure: unrecognized_keys

Payload.relaxed().parse({ id: 1, email: 'a@b.com', extra: true });
// => { id: 1, email: 'a@b.com', extra: true }
```

### `refine()` vs `refineAsync()`

```ts
const PasswordSchema = v
  .string()
  .min(8)
  .refine((value) => /[A-Z]/.test(value), 'Must contain an uppercase letter');

const UniqueEmailSchema = v
  .string()
  .email()
  .refineAsync(async (value) => {
    const exists = await db.users.exists({ email: value });

    return !exists;
  }, 'Email already in use');

PasswordSchema.parse('Hello123');
await UniqueEmailSchema.parseAsync('a@b.com');
```

### Error shaping for forms

```ts
const RegistrationSchema = v
  .object({
    password: v.string().min(8),
    confirmPassword: v.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, 'Passwords must match');

const result = RegistrationSchema.safeParse(input);

if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flattenFirst();

  console.log(fieldErrors);
  console.log(formErrors);
}
```

## API At A Glance

- String methods: `min`, `max`, `length`, `nonEmpty`, `startsWith`, `endsWith`, `includes`, `regex`, `email`, `url`, `uuid`, `isoDate`, `isoDateTime`, `ip`, `trim`, `lowercase`, `uppercase`
- Number methods: `min`, `max`, `int`, `positive`, `negative`, `nonNegative`, `nonPositive`, `multipleOf`, `safe`
- Array methods: `min`, `max`, `length`, `nonEmpty`, `unique`
- Object helpers: `partial`, `required`, `extend`, `pick`, `omit`, `relaxed`
- Errors and types: `ValidationError`, `ErrorCode`, `Issue`, `ParseResult<T>`, `Messages`, `Infer<T>`, `InferOutput<T>`, `TypeOf<T>`

## Notes

- `v.object(...)` is strict by default and rejects unknown keys.
- Use `.relaxed()` when you want unknown keys to pass through.
- `v.union(...)` and `v.intersect(...)` accept both schemas and raw literal branches.
- `array.unique()` uses JavaScript `Set` semantics, so objects are compared by reference.
- `array.unique()` emits `not_unique` issue codes.
- `number.safe()` emits `not_safe` issue codes.
- `default()` only applies when the input is `undefined`, not on `null` or other invalid values.
- `v.record(keySchema, valueSchema)` uses parsed keys in output (sync and async parsing).

## Documentation

- [Overview](https://vielzeug.dev/validit/)
- [Usage Guide](https://vielzeug.dev/validit/usage)
- [API Reference](https://vielzeug.dev/validit/api)
- [Examples](https://vielzeug.dev/validit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) - part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
