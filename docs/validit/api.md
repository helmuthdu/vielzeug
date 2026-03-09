---
title: Validit — API Reference
description: Complete API reference for Validit schemas and methods.
---

# Validit API Reference

[[toc]]

## Core Exports

```ts
import {
  v, // Main factory object
  type Infer, // Type inference utility
  type Schema, // Base schema class
  ValidationError, // Error class
  type ParseResult, // Result type for safeParse
  type Issue, // Individual error type
} from '@vielzeug/validit';
```

## Factory Object: `v`

The main entry point for creating schemas.

### Primitive Schemas

#### `v.string()`

Creates a string schema.

```ts
v.string(); // string
```

**Methods:**

- `.min(length: number, message?: string)` – Minimum length
- `.max(length: number, message?: string)` – Maximum length
- `.length(exact: number, message?: string)` – Exact length
- `.nonempty(message?: string)` – Shorthand for `.min(1)`
- `.startsWith(prefix: string, message?: string)` – Must start with prefix
- `.endsWith(suffix: string, message?: string)` – Must end with suffix
- `.pattern(regex: RegExp, message?: string)` – Regex pattern
- `.email(message?: string)` – Email validation
- `.url(message?: string)` – URL validation
- `.uuid(message?: string)` – UUID format
- `.trim()` – Trims whitespace from the string before validation (preprocessor)

#### `v.number()`

Creates a number schema.

```ts
v.number(); // number
```

**Methods:**

- `.min(minimum: number, message?: string)` – Minimum value
- `.max(maximum: number, message?: string)` – Maximum value
- `.int(message?: string)` – Must be integer
- `.positive(message?: string)` – Must be > 0
- `.negative(message?: string)` – Must be < 0
- `.nonNegative(message?: string)` – Must be >= 0 (alias for `.min(0)`)
- `.nonPositive(message?: string)` – Must be <= 0 (alias for `.max(0)`)
- `.multipleOf(step: number, message?: string)` – Must be divisible by step

#### `v.boolean()`

Creates a boolean schema.

```ts
v.boolean(); // boolean
```

#### `v.date()`

Creates a Date schema.

```ts
v.date(); // Date
```

**Methods:**

- `.min(date: Date, message?: string)` – After date
- `.max(date: Date, message?: string)` – Before date

---

### Union / Intersection Schemas

#### `v.oneOf(...schemas)`

Exactly one schema must match. Fails if zero or more than one branch passes (mutual exclusion).

Each argument can be a `Schema` instance **or** a raw literal value (`string | number | boolean | null | undefined`) — raw values are automatically wrapped in `v.literal()`.

```ts
v.oneOf(v.string(), v.number()); // string | number
v.oneOf('light', 'dark');         // 'light' | 'dark'
v.oneOf('ok', 'error', v.null()); // mix of raw and schema

// Discriminated union
v.oneOf(
  v.object({ type: v.literal('ok'),    data: v.string() }),
  v.object({ type: v.literal('error'), message: v.string() }),
);
```

#### `v.noneOf(...schemas)`

Passes only when the value matches **none** of the given schemas. Useful as a blocklist or exclusion guard. All validators (including constraints like `.min()`) are run.

```ts
v.noneOf('admin', 'system');      // shorthand — anything except 'admin' or 'system'
v.noneOf(v.string(), v.number()); // accepts true, null, Date, etc. but not strings or numbers
// error code: 'invalid_none_of'
```

#### `v.allOf(...schemas)`

All schemas must pass. Useful for intersection / mixin patterns.

```ts
v.allOf(v.string(), v.string().min(5)); // all constraints apply

const AdminSchema = v.allOf(
  v.object({ id: v.number() }),
  v.object({ permissions: v.array(v.string()) }),
);
```

---

### Special Schemas

#### `v.never()`

Always fails. Useful as a disallowed branch in a union.

```ts
v.never(); // never
```

#### `v.lazy(getter)`

Defers schema resolution, enabling recursive / circular type definitions.

```ts
type Category = { name: string; subcategories: Category[] };

const CategorySchema: Schema<Category> = v.lazy(() =>
  v.object({
    name: v.string(),
    subcategories: v.array(CategorySchema),
  }),
);
```

**Parameters:**

- `getter: () => Schema<T>` – Called once on first parse; result is cached

#### `v.instanceof(cls)`

Validates that the value is an instance of the given class.

```ts
v.instanceof(Date); // Date
v.instanceof(MyCustomClass); // MyCustomClass
```

**Parameters:**

- `cls: new (...args: any[]) => T` – The constructor to check against

---

### Complex Schemas

#### `v.array(schema)`

Creates an array schema.

```ts
v.array(v.number()); // number[]
```

**Parameters:**

- `schema: Schema<T>` – Schema for array items

**Methods:**

- `.min(length: number, message?: string)` – Minimum items
- `.max(length: number, message?: string)` – Maximum items
- `.length(exact: number, message?: string)` – Exact number of items
- `.nonempty(message?: string)` – Shorthand for `.min(1)`

#### `v.object(shape)`

Creates an object schema.

```ts
v.object({
  name: v.string(),
  age: v.number(),
});
```

**Parameters:**

- `shape: Record<string, Schema<any>>` – Object shape definition

**Methods:**

- `.partial()` – Make all fields optional
- `.required()` – Strip optional from all fields (inverse of `partial()`)
- `.pick(...keys)` – Select specific fields
- `.omit(...keys)` – Exclude specific fields
- `.extend(shape)` – Add or override fields
- `.strip()` – Remove unknown keys (default behaviour)
- `.passthrough()` – Allow unknown keys through
- `.strict()` – Reject objects with unknown keys
- `.shape` – Public property exposing the raw shape definition

---

### Convenience Schemas

#### `v.email()`

Shorthand for `v.string().email()`.

```ts
v.email(); // string (email format)
```

#### `v.url()`

Shorthand for `v.string().url()`.

```ts
v.url(); // string (URL format)
```

#### `v.uuid()`

UUID validation.

```ts
v.uuid(); // string (UUID format)
```

#### `v.int()`

Shorthand for `v.number().int()`.

```ts
v.int(); // number (integer)
v.int().positive(); // positive integer
```

---

### Utility Schemas

#### `v.any()`

Accepts any value (no validation).

```ts
v.any(); // any
```

#### `v.unknown()`

Accepts any value (typed as `unknown`).

```ts
v.unknown(); // unknown
```

#### `v.null()`

Matches `null` exactly.

```ts
v.null(); // null
```

#### `v.undefined()`

Matches `undefined` exactly.

```ts
v.undefined(); // undefined
```

---

### Coercion (Experimental)

#### `v.coerce.string()`

Converts values to string.

```ts
v.coerce.string().min(1);
// Accepts: string, number, boolean
// Rejects: null, undefined
```

#### `v.coerce.number()`

Converts strings to numbers.

```ts
v.coerce.number().int().positive();
// Accepts: number, numeric string
// Rejects: non-numeric strings
```

#### `v.coerce.boolean()`

Converts values to boolean.

```ts
v.coerce.boolean();
// Accepts: boolean, 'true', 'false', 1, 0
// Returns: boolean
```

#### `v.coerce.date()`

Converts values to Date.

```ts
v.coerce.date().min(new Date('2000-01-01'));
// Accepts: Date, date string, timestamp (number)
// Returns: Date
```

---

## `pipe(...schemas)`

Chains schemas in sequence: each schema's output is passed as input to the next. Useful for preprocessing followed by validation.

```ts
import { pipe } from '@vielzeug/validit';

// String input → coerce to number → apply number constraints
const schema = pipe(v.string(), v.coerce.number(), v.number().int().min(0));
schema.parse('42'); // → 42
```

```ts
export function pipe<A>(a: Schema<A>): Schema<A>;
export function pipe<A, B>(a: Schema<A>, b: Schema<B>): Schema<B>;
export function pipe<A, B, C>(a: Schema<A>, b: Schema<B>, c: Schema<C>): Schema<C>;
// ... up to 4 schemas
```

## Schema Methods

All schemas inherit these methods:

### Validation

#### `parse(value: unknown): Output`

Validates and returns data. Throws `ValidationError` on failure.

```ts
const user = schema.parse(data);
// Throws ValidationError if invalid
```

#### `safeParse(value: unknown): ParseResult<Output>`

Validates and returns a result object. Never throws.

```ts
const result = schema.safeParse(data);

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error);
}
```

**Returns:**

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

#### `parseAsync(value: unknown): Promise<Output>`

Async version of `parse()`. Required for async validators.

```ts
const user = await schema.parseAsync(data);
```

#### `safeParseAsync(value: unknown): Promise<ParseResult<Output>>`

Async version of `safeParse()`.

```ts
const result = await schema.safeParseAsync(data);
```

---

### Modifiers

#### `optional(): this & Schema<Output | undefined>`

Makes the schema accept `undefined`.

```ts
v.string().optional(); // string | undefined
v.email().optional(); // string | undefined
```

::: tip 💡 Validation Defaults
All schemas **reject `null` and `undefined` by default**. You don't need a `required()` method!

- Use `.optional()` to allow `undefined`
- Use `.nullable()` to allow `null`
- Use `.min(1)` to reject empty strings or arrays
  :::

#### `nullable(): this & Schema<Output | null>`

Makes the schema accept `null`.

```ts
v.string().nullable(); // string | null
v.number().nullable(); // number | null
```

#### `default(value: Output): this`

Provides a default value when `undefined`.

```ts
v.string().default('hello'); // 'hello' if undefined
v.number().default(0); // 0 if undefined
v.boolean().default(false); // false if undefined
```

---

### Custom Validation

#### `refine(check: (value: Output) => boolean | Promise<boolean>, message?: string): this`

Adds custom validation logic. Supports both sync and async check functions. Async functions are automatically deferred to `parseAsync()` / `safeParseAsync()`.

```ts
// Sync
v.string().refine((val) => val.length >= 3, 'Must be at least 3 characters');
v.number().refine((val) => val % 2 === 0, 'Must be even');

// Async
v.email().refine(async (email) => {
  const exists = await db.users.findOne({ email });
  return !exists;
}, 'Email already registered');
```

**Parameters:**

- `check: (value: Output) => boolean | Promise<boolean>` – Sync or async validation function
- `message?: string` – Error message (default: `'Invalid value'`)

::: warning
Schemas with async validators must use `parseAsync()` or `safeParseAsync()`. Calling `parse()` on such a schema throws an error.
:::

---

### Utilities

#### `transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput>`

Applies a transformation after validation.

```ts
v.string()
  .email()
  .transform((email) => email.toLowerCase());

v.string().transform((str) => str.split(','));
```

**Parameters:**

- `fn: (value: Output) => NewOutput` – Transformation function

::: warning
Transform returns a generic `Schema<NewOutput>`, so you lose type-specific methods. Apply validators before transforming.
:::

## Types

### `Infer<T>`

Extracts the TypeScript type from a schema.

```ts
import { type Infer } from '@vielzeug/validit';

const schema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.email().optional(),
});

type User = Infer<typeof schema>;
// {
//   id: number;
//   name: string;
//   email?: string | undefined;
// }
```

### `Schema<Output>`

Base schema class. All schemas extend this.

```ts
class Schema<Output = unknown> {
  parse(value: unknown): Output;
  safeParse(value: unknown): ParseResult<Output>;
  parseAsync(value: unknown): Promise<Output>;
  safeParseAsync(value: unknown): Promise<ParseResult<Output>>;
  // ... modifiers and utilities
}
```

### `ValidationError`

Error thrown by `parse()` and `parseAsync()`.

```ts
class ValidationError extends Error {
  readonly issues: Issue[];

  /** Typesafe instanceof check — useful in catch blocks. */
  static is(value: unknown): value is ValidationError;
}
```

Using `ValidationError.is()` in catch blocks avoids unsafe casts:

```ts
try {
  schema.parse(data);
} catch (error) {
  if (ValidationError.is(error)) {
    error.issues.forEach((i) => console.log(i.message));
  } else {
    throw error; // unexpected error
  }
}
```
  readonly message: string;
  readonly name: 'ValidationError';
}
```

**Properties:**

- `issues: Issue[]` – Array of validation errors
- `message: string` – Formatted error message

### `Issue`

Individual validation error.

```ts
type Issue = {
  path: (string | number)[];
  message: string;
  code?: string;
  params?: Record<string, unknown>;
};
```

**Properties:**

- `path` – Field path (e.g., `['user', 'email']`)
- `message` – Error message
- `code` – Error code (for i18n)
- `params` – Additional parameters

### `ParseResult<T>`

Result type for `safeParse()` and `safeParseAsync()`.

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

## Error Codes

Built-in error codes for internationalization:

| Code             | Description                     |
| ---------------- | ------------------------------- |
| `invalid_type`   | Wrong type                      |
| `invalid_date`   | Invalid Date object             |
| `invalid_literal`| Value does not match literal    |
| `invalid_enum`   | Value not in enum               |
| `invalid_union`  | Does not match any union type   |
| `invalid_url`    | Invalid URL format              |
| `invalid_string` | Pattern/email/uuid mismatch     |
| `invalid_length` | Wrong length                    |
| `not_integer`    | Not an integer                  |
| `too_small`      | Below minimum                   |
| `too_big`        | Above maximum                   |
| `custom`         | Custom refinement failed        |

## Performance Tips

### Reuse Schemas

Create schemas once and reuse them:

```ts
// ✅ Good
const emailSchema = v.email();
const user1 = emailSchema.parse(email1);
const user2 = emailSchema.parse(email2);

// ❌ Avoid
const user1 = v.email().parse(email1);
const user2 = v.email().parse(email2);
```

### Use Convenience Schemas

Convenience schemas are optimized shortcuts:

```ts
// ✅ Preferred
v.email();
v.int().positive();

// ⚠️ Works but longer
v.string().email();
v.number().int().positive();
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./usage">Usage Guide</a> – Comprehensive usage patterns</li>
      <li><a href="./examples">Examples</a> – Real-world examples</li>
    </ul>
  </div>
</div>
