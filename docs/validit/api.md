# Validit API Reference

Complete API documentation for all Validit schemas and methods.

## Table of Contents

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

- `.min(length: number, message?: string)` - Minimum length
- `.max(length: number, message?: string)` - Maximum length
- `.length(exact: number, message?: string)` - Exact length
- `.pattern(regex: RegExp, message?: string)` - Regex pattern
- `.email(message?: string)` - Email validation
- `.url(message?: string)` - URL validation
- `.uuid(message?: string)` - UUID format
- `.trim()` - Must be trimmed (validation only, doesn't transform)

#### `v.number()`

Creates a number schema.

```ts
v.number(); // number
```

**Methods:**

- `.min(minimum: number, message?: string)` - Minimum value
- `.max(maximum: number, message?: string)` - Maximum value
- `.int(message?: string)` - Must be integer
- `.positive(message?: string)` - Must be > 0
- `.negative(message?: string)` - Must be < 0

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

- `.min(date: Date, message?: string)` - After date
- `.max(date: Date, message?: string)` - Before date

---

### Literal & Enum Schemas

#### `v.literal(value)`

Creates a schema that matches an exact value.

```ts
v.literal('active'); // type: 'active'
v.literal(42); // type: 42
v.literal(true); // type: true
```

**Parameters:**

- `value: string | number | boolean` - The exact value to match

#### `v.enum(...values)`

Creates an enum schema from a list of values.

```ts
v.enum('red', 'green', 'blue'); // 'red' | 'green' | 'blue'
v.enum(1, 2, 3); // 1 | 2 | 3
v.enum('admin', 'user', 'guest'); // 'admin' | 'user' | 'guest'
```

**Parameters:**

- `...values: [T, ...T[]]` - At least one value required

---

### Complex Schemas

#### `v.array(schema)`

Creates an array schema.

```ts
v.array(v.number()); // number[]
```

**Parameters:**

- `schema: Schema<T>` - Schema for array items

**Methods:**

- `.min(length: number, message?: string)` - Minimum items
- `.max(length: number, message?: string)` - Maximum items
- `.length(exact: number, message?: string)` - Exact number of items

#### `v.object(shape)`

Creates an object schema.

```ts
v.object({
  name: v.string(),
  age: v.number(),
});
```

**Parameters:**

- `shape: Record<string, Schema<any>>` - Object shape definition

**Methods:**

- `.partial()` - Make all fields optional
- `.pick(...keys)` - Select specific fields
- `.omit(...keys)` - Exclude specific fields

#### `v.union(...schemas)`

Creates a union schema.

```ts
v.union(v.string(), v.number()); // string | number
v.union(v.object({ type: v.literal('a'), value: v.string() }), v.object({ type: v.literal('b'), value: v.number() }));
```

**Parameters:**

- `...schemas: [Schema<T>, Schema<U>, ...Schema<any>[]]` - At least 2 schemas

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

#### `v.int().positive()`

Shorthand for `v.number().int().positive()`.

```ts
v.int().positive(); // number (positive integer)
```

#### `v.int().negative()`

Shorthand for `v.number().int().negative()`.

```ts
v.int().negative(); // number (negative integer)
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

#### `v.void()`

Alias for `v.undefined()`.

```ts
v.void(); // undefined
```

---

### Coercion (Experimental)

#### `v.coerce.string()`

Converts values to string.

```ts
v.coerce.string();
// Accepts: string, number, boolean
// Returns: string
```

#### `v.coerce.number()`

Converts strings to numbers.

```ts
v.coerce.number();
// Accepts: number, numeric string
// Returns: number
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
v.coerce.date();
// Accepts: Date, date string, timestamp
// Returns: Date
```

::: warning
Coercion features are experimental and have limitations. Use with caution in production.
:::

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

#### `refine(check: (value: Output) => boolean, message?: string): this`

Adds sync custom validation.

```ts
v.string().refine((val) => val.length >= 3, 'Must be at least 3 characters');

v.number().refine((val) => val % 2 === 0, 'Must be even');
```

**Parameters:**

- `check: (value: Output) => boolean` - Validation function
- `message?: string` - Error message (default: 'Invalid value')

#### `refineAsync(check: (value: Output) => Promise<boolean> | boolean, message?: string): this`

Adds async custom validation.

```ts
v.string().refineAsync(async (val) => {
  const exists = await checkDatabase(val);
  return !exists;
}, 'Already exists');
```

**Parameters:**

- `check: (value: Output) => Promise<boolean> | boolean` - Async validation function
- `message?: string` - Error message

::: warning
Schemas with async validators must use `parseAsync()` or `safeParseAsync()`. Calling `parse()` will throw an error.
:::

---

### Utilities

#### `describe(description: string): this`

Adds a description for better error messages.

```ts
v.number().int().min(0).describe('age');

// Errors will show: "age: Must be at least 0"
```

**Parameters:**

- `description: string` - Field description

#### `transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput>`

Applies a transformation after validation.

```ts
v.string()
  .email()
  .transform((email) => email.toLowerCase());

v.string().transform((str) => str.split(','));
```

**Parameters:**

- `fn: (value: Output) => NewOutput` - Transformation function

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
  readonly message: string;
  readonly name: 'ValidationError';
}
```

**Properties:**

- `issues: Issue[]` - Array of validation errors
- `message: string` - Formatted error message

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

- `path` - Field path (e.g., `['user', 'email']`)
- `message` - Error message
- `code` - Error code (for i18n)
- `params` - Additional parameters

### `ParseResult<T>`

Result type for `safeParse()` and `safeParseAsync()`.

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

## Error Codes

Built-in error codes for internationalization:

| Code             | Description              |
| ---------------- | ------------------------ |
| `invalid_type`   | Wrong type               |
| `invalid_email`  | Invalid email format     |
| `invalid_url`    | Invalid URL format       |
| `invalid_string` | Pattern mismatch         |
| `invalid_length` | Wrong length             |
| `too_small`      | Below minimum            |
| `too_big`        | Above maximum            |
| `custom`         | Custom refinement failed |

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
      <li><a href="./usage">Usage Guide</a> - Comprehensive usage patterns</li>
      <li><a href="./examples">Examples</a> - Real-world examples</li>
    </ul>
  </div>
</div>
