---
title: Validit — API Reference
description: Complete API reference for Validit schemas and methods.
---

## Validit API Reference

[[toc]]

## Core Exports

```ts
import {
  v,              // Main factory object
  ValidationError, // Error class
  ErrorCode,      // Const object of all built-in error code strings
  type Infer,     // Type inference utility (output type)
  type InferInput,// Input type extraction
  type InferOutput,// Output type extraction (alias for Infer)
  type Schema,    // Base schema class
  type ParseResult, // Result type for safeParse
  type Issue,     // Individual error type
  type MessageFn, // Typed message-function parameter type
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

- `.min(length, message?)` – Minimum length; `params: { minimum: length }`
- `.max(length, message?)` – Maximum length; `params: { maximum: length }`
- `.length(exact, message?)` – Exact length; `params: { exact }`
- `.nonempty(message?)` – Shorthand for `.min(1)`
- `.startsWith(prefix, message?)` – Must start with prefix; `params: { prefix }`
- `.endsWith(suffix, message?)` – Must end with suffix; `params: { suffix }`
- `.includes(substr, message?)` – Must contain substring; `params: { includes: substr }`
- `.regex(pattern, message?)` – Regex pattern match; `params: { pattern: pattern.source }`
- `.email(message?)` – Email address format; `params: { format: 'email' }`
- `.url(message?)` – URL format (error code: `invalid_url`); `params: { format: 'url' }`
- `.uuid(message?)` – UUID v4 format; `params: { format: 'uuid' }`
- `.date(message?)` – `YYYY-MM-DD` date string; `params: { format: 'date' }`
- `.datetime(message?)` – ISO 8601 datetime string; `params: { format: 'datetime' }`
- `.trim()` – Trims whitespace from the string **before** validation (preprocessor, no error)
- `.lowercase()` – Lowercases the string **before** validation (preprocessor, no error)
- `.uppercase()` – Uppercases the string **before** validation (preprocessor, no error)

::: tip Error params
Every string constraint populates `Issue.params` so you can identify the failing rule without parsing the message string. Example use cases: rendering built-in browser constraint messages, i18n overrides keyed by `params.format`.
:::

#### `v.number()`

Creates a number schema.

```ts
v.number(); // number
```

**Methods:**

- `.min(minimum: number, message?: string | MessageFn<{ min: number }>)` – Minimum value
- `.max(maximum: number, message?: string | MessageFn<{ max: number }>)` – Maximum value
- `.int(message?: string | MessageFn)` – Must be integer
- `.positive(message?: string | MessageFn)` – Must be > 0
- `.negative(message?: string | MessageFn)` – Must be < 0
- `.nonNegative(message?: string | MessageFn)` – Must be >= 0 (alias for `.min(0)`)
- `.nonPositive(message?: string | MessageFn)` – Must be <= 0 (alias for `.max(0)`)
- `.multipleOf(step: number, message?: string | MessageFn)` – Must be divisible by step

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

#### `v.union(...schemas)`

First-match union — tries each schema in order and returns the **output of the first succeeding branch** (including coercions and transforms). Fails only if every branch fails.

Each argument can be a `Schema` instance **or** a raw literal value (`string | number | boolean | null | undefined`) — raw values are automatically wrapped in `v.literal()`.

```ts
v.union(v.string(), v.number()); // string | number
v.union('light', 'dark'); // 'light' | 'dark'
v.union('ok', 'error', v.null()); // mix of raw and schema

// Branch output is returned — coercions work correctly
v.union(v.coerce.number(), v.string()).parse('42'); // → 42 (number, not string)

// With object schemas
v.union(
  v.object({ type: v.literal('ok'), data: v.string() }),
  v.object({ type: v.literal('error'), message: v.string() }),
);
```

**Properties:**

- `.schemas` — The normalized array of branch schemas (read-only)

**Error params:**

- `params.errors` — Array of issue arrays from each failing branch (one per branch)

#### `v.intersect(...schemas)`

All schemas must pass. Issues from all failing branches are collected and returned together. Useful for intersection / mixin patterns.

```ts
v.intersect(v.string(), v.string().min(5)); // all constraints apply

const AdminSchema = v.intersect(v.object({ id: v.number() }), v.object({ permissions: v.array(v.string()) }));
```

**Properties:**

- `.schemas` — The normalized array of branch schemas (read-only)

#### `v.variant(discriminator, map)`

Discriminated union — dictionary API. The **key** of each entry in `map` is the discriminating value; the library injects the discriminator field automatically at runtime. O(1) dispatch.

```ts
const ResultSchema = v.variant('type', {
  ok:    v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});

ResultSchema.parse({ type: 'ok',    data: 'hello' }); // ✓
ResultSchema.parse({ type: 'error', message: 'oops' }); // ✓
ResultSchema.parse({ type: 'unknown' }); // ✗ invalid_variant
```

**Parameters:**

- `discriminator: string` – The key injected into each branch to hold the tag value
- `map: Record<string, ObjectSchema>` – Mapping from tag value → branch schema

#### `v.enum(values)`

Creates an enum schema from a `readonly` tuple of strings.

```ts
const Status = v.enum(['active', 'inactive', 'pending'] as const);
// Infer<typeof Status> → 'active' | 'inactive' | 'pending'

Status.parse('active'); // ✓
Status.parse('deleted'); // ✗ invalid_enum
```

**Parameters:**

- `values: readonly [string, ...string[]]` – At least one string value

**Properties:**

- `.values` – The original `values` tuple

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

#### `v.tuple(items)`

Creates a fixed-length tuple schema. Each position has its own schema.

```ts
v.tuple([v.string(), v.number(), v.boolean()] as const);
// Infer: [string, number, boolean]
```

**Parameters:**

- `items: readonly [Schema, ...Schema[]]` – Schemas for each position

#### `v.record(keySchema, valueSchema)`

Creates a record/dictionary schema.

```ts
v.record(v.string(), v.number()); // Record<string, number>
v.record(v.string(), v.object({ label: v.string() }));
```

**Parameters:**

- `keySchema: Schema<K>` – Schema for all keys (typically `v.string()`)
- `valueSchema: Schema<V>` – Schema for all values

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

- `.partial()` – Make **all** fields optional
- `.partial(...keys)` – Make only the listed **keys** optional (selective partial)
- `.required()` – Strip `optional` from all fields (delegates to base `Schema.required()` per-field); preserves all schema metadata
- `.pick(...keys)` – Select specific fields
- `.omit(...keys)` – Exclude specific fields
- `.extend(shape)` – Add or override fields
- `.strip()` – Remove unknown keys (default behaviour)
- `.passthrough()` – Allow unknown keys through
- `.strict()` – Reject objects with unknown keys

**Properties:**

- `.shape` – The raw shape definition (read-only)

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
// Accepts: boolean, 'true', 'false', '1', '0', 1, 0
// Returns: boolean
```

#### `v.coerce.date()`

Converts values to Date.

```ts
v.coerce.date().min(new Date('2000-01-01'));
// Accepts: Date, date string, timestamp (number)
// Returns: Date
```

## Schema Methods

All schemas inherit these methods:

---

### Factory Shorthands: `v.optional()` / `v.nullable()` / `v.nullish()`

Convenience wrappers for the common modifier patterns:

```ts
v.optional(v.string()); // equivalent to v.string().optional()
v.nullable(v.string()); // equivalent to v.string().nullable()
v.nullish(v.string());  // equivalent to v.string().nullish()
```

---

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
v.number().optional(); // number | undefined
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

#### `nullish(): this & Schema<Output | null | undefined>`

Combines `.optional().nullable()` — accepts `null` or `undefined`.

```ts
v.string().nullish(); // string | null | undefined
v.number().nullish(); // number | null | undefined
```

#### `required(): Schema<Exclude<Output, undefined>, Input>`

Removes `undefined` from the output type. Reverses the effect of `.optional()`.

```ts
v.string().optional().required(); // string (no longer | undefined)
```

Also used internally by `ObjectSchema.required()` to strip optional from each field without direct prototype mutation.

#### `default(value: Output): this`

Provides a default value when `undefined`.

```ts
v.string().default('hello'); // 'hello' if undefined
v.number().default(0); // 0 if undefined
v.boolean().default(false); // false if undefined
```

---

### Custom Validation

#### `refine(check: (value: Output) => boolean, message?: string | ((ctx: { value: Output }) => string)): this`

Adds a **sync-only** custom validator. **Throws at definition time** if given an async function — use `refineAsync()` for that.

```ts
// Static message
v.string().refine((val) => val.length >= 3, 'Must be at least 3 characters');

// Dynamic message via function
v.string().refine(
  (val) => val.includes('@'),
  ({ value }) => `'${value}' is not a valid email`,
);

v.number().refine((val) => val % 2 === 0, 'Must be even');

// Cross-field object validation
v.object({ password: v.string(), confirmPassword: v.string() })
  .refine((data) => data.password === data.confirmPassword, 'Passwords must match');
```

**Parameters:**

- `check: (value: Output) => boolean` – Synchronous validation function; returns `true` to pass
- `message?: string | ((ctx: { value: Output }) => string)` – Error message or message function (default: `'Invalid value'`)

::: warning
Passing an async function to `refine()` throws an error at schema definition time. Use `refineAsync()` instead.
:::

#### `refineAsync(check: (value: Output) => Promise<boolean>, message?: string | ((ctx: { value: Output }) => string)): this`

Adds an **async** custom validator. Schemas with async validators must use `parseAsync()` or `safeParseAsync()`; calling `parse()` throws.

```ts
v.string().email().refineAsync(async (email) => {
  const exists = await db.users.findOne({ email });
  return !exists;
}, ({ value }) => `The address '${value}' is already registered`);

// Object-level async validation
v.object({ password: v.string(), confirmPassword: v.string() })
  .refineAsync(async (data) => data.password === data.confirmPassword, 'Passwords must match');
```

**Parameters:**

- `check: (value: Output) => Promise<boolean>` – Async validation function; resolves to `true` to pass
- `message?: string | ((ctx: { value: Output }) => string)` – Error message or message function (default: `'Invalid value'`)

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

#### `catch(fallback: Output): this`

Returns itself (same schema instance) but wraps it so any validation failure silently returns `fallback` instead of throwing. Useful for non-critical fields.

```ts
v.string().catch('default');
v.number().catch(0);
v.object({ name: v.string() }).catch({ name: 'anonymous' });
```

#### `describe(description: string): this`

Attaches a description for documentation or tooling generation. Accessible as `schema._description` at runtime.

```ts
v.number().min(0).describe('A non-negative count value');
```

#### `brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input>`

Brands the output type for nominal typing. Zero runtime cost.

```ts
const UserId = v.string().brand<'UserId'>();
type UserId = Infer<typeof UserId>; // string & { __brand: 'UserId' }

const id = UserId.parse('abc-123'); // UserId (not assignable to plain string)
```

#### `is(value: unknown): value is Output`

Type guard — narrows `value` to `Output` using `safeParse`. Never throws.

```ts
if (v.string().is(maybeString)) {
  console.log(maybeString.toUpperCase()); // TypeScript knows it's a string
}
```

## Types

### `Infer<T>` / `InferOutput<T>`

Extracts the **output** TypeScript type from a schema. `InferOutput<T>` is an alias for `Infer<T>`.

```ts
import { type Infer, type InferOutput } from '@vielzeug/validit';

const schema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.string().email().optional(),
});

type User = Infer<typeof schema>;
// {
//   id: number;
//   name: string;
//   email?: string | undefined;
// }
```

### `InferInput<T>`

Extracts the **input** TypeScript type from a schema. Most schemas have matching input and output types.

```ts
import { v, type InferInput, type InferOutput } from '@vielzeug/validit';

const schema = v.string();
type In  = InferInput<typeof schema>;   // string
type Out = InferOutput<typeof schema>;  // string
```

### `Schema<Output, Input>`

Base schema class. All schemas extend this.

```ts
class Schema<Output = unknown, Input = unknown> {
  parse(value: Input): Output;
  safeParse(value: Input): ParseResult<Output>;
  parseAsync(value: Input): Promise<Output>;
  safeParseAsync(value: Input): Promise<ParseResult<Output>>;
  // ... modifiers and utilities
}
```

### `ValidationError`

Error thrown by `parse()` and `parseAsync()`.

```ts
class ValidationError extends Error {
  readonly issues: Issue[];

  /**
   * Flatten all issues into a form-friendly structure:
   * - fieldErrors: per-field error lists keyed by path string
   * - formErrors: root-level errors (from top-level .refine())
   */
  flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] };

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

````text

**Properties:**

- `issues: Issue[]` – Array of validation errors
- `message: string` – Formatted error message

### `Issue`

Individual validation error.

```ts
type Issue = {
  path: (string | number)[];
  message: string;
  code: string; // see ErrorCode
  params?: Record<string, unknown>;
};
````

**Properties:**

- `path` – Field path (e.g., `['user', 'email']`)
- `message` – Error message
- `code` – Error code (e.g., `'invalid_string'`, `'too_small'`)
- `params` – Additional context (e.g., `{ minimum: 3 }`)

### `ErrorCode`

Const object of all built-in error code strings. Import it for programmatic error handling.

```ts
import { ErrorCode } from '@vielzeug/validit';

const result = v.string().url().safeParse('not-a-url');
if (!result.success) {
  const issue = result.error.issues[0];
  issue.code === ErrorCode.invalid_url; // true
}
```

| Code | Emitted by |
|---|---|
| `custom` | `.refine()` / `.refineAsync()` |
| `invalid_date` | `v.date()` |
| `invalid_enum` | `v.enum()` |
| `invalid_length` | `v.tuple()`, `.length()` |
| `invalid_literal` | `v.literal()` |
| `invalid_string` | `.email()`, `.regex()`, `.startsWith()`, `.endsWith()`, `.includes()`, `.date()`, `.datetime()`, `.lowercase()`, `.uppercase()` |
| `invalid_type` | Type mismatch |
| `invalid_union` | `v.union()` |
| `invalid_url` | `.url()` |
| `invalid_variant` | `v.variant()` discriminator mismatch |
| `not_integer` | `.int()` |
| `not_multiple_of` | `.multipleOf()` |
| `too_big` | `.max()`, `.negative()`, `.nonPositive()` |
| `too_small` | `.min()`, `.positive()`, `.nonNegative()`, `.nonempty()` |
| `unrecognized_keys` | `v.object().strict()` |

- `code` – Error code (for i18n)
- `params` – Additional parameters

### `ParseResult<T>`

Result type for `safeParse()` and `safeParseAsync()`.

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

### `MessageFn<Ctx>`

The type of context-aware message functions accepted by every `message?` parameter:

```ts
type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  (ctx: Ctx) => string;
```

Each schema method passes relevant context. For example:

```ts
v.string().min(5, ({ min, value }) => `'${value}' has only ${value.length} chars; need at least ${min}`);
v.number().max(100, ({ max }) => `Value exceeds the maximum of ${max}`);
v.string().refine((v) => v.startsWith('sk_'), ({ value }) => `'${value}' is not a valid key`);
```

## Performance Tips

### Reuse Schemas

Create schemas once and reuse them:

```ts
// ✅ Good
const emailSchema = v.string().email();
const user1 = emailSchema.parse(email1);
const user2 = emailSchema.parse(email2);

// ❌ Avoid recreating schemas on every call
const user1 = v.string().email().parse(email1);
const user2 = v.string().email().parse(email2);
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
