---
title: Validit — Usage Guide
description: Schema types, chaining, coercion, and advanced validation patterns for Validit.
---

## Validit Usage Guide

::: tip New to Validit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Validit?

Runtime validation is essential for forms, API responses, and environment config. Validit gives you schema-first validation without adding Zod (~14 kB) or Yup (~22 kB) to your bundle.

```ts
// Before — manual type narrowing
function validateUser(raw: unknown): User {
  if (typeof raw !== 'object' || !raw) throw new Error('Not an object');
  if (typeof (raw as any).name !== 'string') throw new Error('name must be string');
  // ... 20 more lines
  return raw as User;
}

// After — Validit
import { v } from '@vielzeug/validit';
const UserSchema = v.object({ name: v.string(), email: v.string().email(), age: v.number().min(0) });
const user = UserSchema.parse(raw);
```

| Feature              | Validit                                       | Zod    | Yup    |
| -------------------- | --------------------------------------------- | ------ | ------ |
| Bundle size          | <PackageInfo package="validit" type="size" /> | ~14 kB | ~22 kB |
| TypeScript inference | ✅                                            | ✅     | ⚠️     |
| Async validation     | ✅                                            | ✅     | ✅     |
| Coercion             | ✅                                            | ✅     | ✅     |
| Zero dependencies    | ✅                                            | ✅     | ❌     |

**Use Validit when** you want schema validation with full TS inference and minimal bundle size.

**Consider Zod** if you need its ecosystem (trpc, drizzle, react-hook-form integration) or its error formatting API.

## Import

```ts
import { v, type Infer, type MessageFn } from '@vielzeug/validit';
// Optional: Import additional types
import type { Schema, ValidationError, ParseResult, Issue, ErrorCode } from '@vielzeug/validit';
```

## Basic Usage

### Creating Schemas

```ts
import { v } from '@vielzeug/validit';

// Primitive schemas
const stringSchema = v.string();
const numberSchema = v.number();
const booleanSchema = v.boolean();

// With constraints
const emailSchema = v.string().email();
const ageSchema = v.number().int().min(18);

// Complex schemas
const userSchema = v.object({
  name: v.string().min(1),
  email: v.string().email(),
  age: v.number().int().min(18),
});
```

### Validating Data

```ts
// Parse – throws on error
const data = schema.parse(input);

// Safe parse – returns result
const result = schema.safeParse(input);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}

// Async validation
const data = await schema.parseAsync(input);
const result = await schema.safeParseAsync(input);
```

## Advanced Features

Validit offers powerful validation capabilities including custom refinements, async validation, type transformations, and comprehensive error handling.

### Custom Refinements

Add custom validation logic with `.refine()`:

```ts
const passwordSchema = v
  .string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val) && /[0-9]/.test(val), 'Must contain uppercase letter and number');
```

### Conditional Validation

Apply validation rules based on other field values:

```ts
const schema = v
  .object({
    type: v.union(v.literal('email'), v.literal('phone')),
    contact: v.string(),
  })
  .refine((data) => {
    if (data.type === 'email') {
      return /^[^@]+@[^@]+$/.test(data.contact);
    }
    return /^\d{10}$/.test(data.contact);
  }, 'Invalid contact format');
```

### Async Validation

Validate against external services or databases using `.refineAsync()`. It must be used with `parseAsync()` or `safeParseAsync()`:

```ts
const emailSchema = v
  .string()
  .email()
  .refineAsync(async (email) => {
    const response = await fetch(`/api/check-email?email=${email}`);
    const { available } = await response.json();
    return available;
  }, 'Email already taken');

// Must use parseAsync / safeParseAsync
const result = await emailSchema.safeParseAsync('test@example.com');
```

### Transform Values

Transform validated data using `.transform()`:

```ts
const trimmedEmail = v
  .string()
  .email()
  .transform((email) => email.toLowerCase().trim());

const csvToArray = v.string().transform((str) => str.split(','));
```

## Primitive Schemas

### String

```ts
// Basic string
v.string();

// With validation
v.string()
  .min(3) // Min length
  .max(100) // Max length
  .length(10) // Exact length
  .nonempty() // Shorthand for .min(1)
  .startsWith('https', 'Must be a secure URL')
  .endsWith('.ts', 'TypeScript files only')
  .includes('foo') // Must contain substring
  .regex(/^[a-z]+$/) // Regex pattern
  .email() // Email format
  .url() // URL format — error code: invalid_url
  .uuid() // UUID v4 format
  .date() // YYYY-MM-DD string
  .datetime() // ISO 8601 datetime string
  .trim() // Trim whitespace before validation
  .lowercase() // Must be all lowercase
  .uppercase(); // Must be all uppercase
```

### Number

```ts
// Basic number
v.number();

// With validation
v.number()
  .min(0) // Minimum value
  .max(100) // Maximum value
  .int() // Must be integer
  .positive() // Must be > 0
  .negative() // Must be < 0
  .nonNegative() // Must be >= 0
  .nonPositive() // Must be <= 0
  .multipleOf(5); // Must be divisible by 5
```

### Boolean

```ts
v.boolean(); // true or false
```

### Date

```ts
v.date() // Date object
  .min(new Date('2020-01-01')) // After date
  .max(new Date()); // Before date
```

### Literal

```ts
v.literal('active'); // Exactly 'active'
v.literal(42); // Exactly 42
v.literal(true); // Exactly true
```

### Enums

```ts
// v.enum — a type-safe string enum from a readonly tuple
const Status = v.enum(['active', 'inactive', 'pending'] as const);
// Infer<typeof Status> → 'active' | 'inactive' | 'pending'

// Union of literals — raw values are accepted as shorthand for v.literal()
v.union('red', 'green', 'blue'); // 'red' | 'green' | 'blue'
v.union('admin', 'user', 'guest'); // 'admin' | 'user' | 'guest'
```

## Complex Schemas

### Arrays

```ts
// Array of strings
v.array(v.string());

// With constraints
v.array(v.string())
  .nonempty() // Rejects empty arrays (shorthand for .min(1))
  .min(1) // At least 1 item
  .max(10) // At most 10 items
  .length(5); // Exactly 5 items

// Nested arrays
v.array(v.array(v.number())); // number[][]
```

### Objects

```ts
// Basic object
v.object({
  name: v.string(),
  age: v.number(),
});

// Nested objects
v.object({
  user: v.object({
    name: v.string(),
    email: v.string().email(),
  }),
  settings: v.object({
    notifications: v.boolean(),
  }),
});

// Object methods
schema.partial(); // Make ALL fields optional
schema.partial('name', 'email'); // Make SPECIFIC fields optional (selective partial)
schema.required(); // Remove optional from all fields (inverse of partial)
schema.pick('name', 'email'); // Select specific fields
schema.omit('password'); // Exclude specific fields
schema.extend({ role: v.string() }); // Add/override fields
schema.strip(); // Remove unknown keys (default)
schema.passthrough(); // Allow unknown keys through
schema.strict(); // Reject unknown keys
schema.shape; // Access raw shape definition
```

### Tuples

```ts
// Fixed-length tuple — each position has its own schema
v.tuple([v.string(), v.number(), v.boolean()] as const);
// Infer: [string, number, boolean]

// With constraints
const PointSchema = v.tuple([v.number(), v.number()] as const);
PointSchema.parse([10, 20]); // [10, 20]
```

### Records

```ts
// Record with typed keys and values
v.record(v.string(), v.number()); // Record<string, number>
v.record(v.string(), v.object({ label: v.string() }));

const Scores = v.record(v.string(), v.number().int().min(0).max(100));
Scores.parse({ alice: 95, bob: 87 }); // { alice: 95, bob: 87 }
```

### Unions

```ts
// v.union: first-match — tries each schema in order, returns the output of the first success
// Branch coercions and transforms are preserved
v.union('light', 'dark'); // 'light' | 'dark'
v.union(v.string(), v.number()); // string | number
v.union(v.coerce.number(), v.string()).parse('42'); // → 42 (number, not '42')

// v.intersect: all schemas must pass (intersection / mixin)
v.intersect(v.object({ id: v.number() }), v.object({ name: v.string() }));

// v.variant: discriminated union — dictionary API, fast O(1) dispatch by the discriminator key
// The key in the map IS the discriminating value (no v.literal() needed in each branch)
v.variant('type', {
  success: v.object({ data: v.string() }),
  error:   v.object({ message: v.string() }),
});
// The discriminator field is injected automatically:
// parse({ type: 'success', data: 'ok' }) ✓
// parse({ type: 'error', message: 'oops' }) ✓
```

## Validation Methods

### Parse (throws)

```ts
try {
  const user = userSchema.parse(data);
  console.log(user); // Typed data
} catch (error) {
  if (ValidationError.is(error)) {
    error.issues.forEach((issue) => {
      console.log(`${issue.path.join('.')}: ${issue.message}`);
    });
  }
}
```

### safeParse()

Returns a result object, never throws.

```ts
const result = schema.safeParse(data);

if (result.success) {
  console.log(result.data); // Typed data
} else {
  console.log(result.error.issues); // Validation errors
}
```

### Async Validation

### parseAsync()

For schemas with async validators.

```ts
const schema = v
  .string()
  .email()
  .refine(async (email) => {
    const exists = await checkDatabase(email);
    return !exists;
  }, 'Email already exists');

try {
  const email = await schema.parseAsync('user@example.com');
} catch (error) {
  if (ValidationError.is(error)) {
    console.error(error.issues);
  }
}
```

### safeParseAsync()

Async version of `safeParse()`.

```ts
const result = await schema.safeParseAsync(data);

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

### Parallel Array Validation

Process array items concurrently for better performance.

```ts
const schema = v.array(
  v
    .object({
      id: v.number(),
      name: v.string(),
    })
    .refineAsync(async (item) => {
      return await validateItem(item);
    }),
);
// Must use parseAsync
const items = await schema.parseAsync(largeArray);
```

## Modifiers

### optional()

Makes a schema accept `undefined`.

```ts
v.string().optional(); // string | undefined
v.string().email().optional(); // string | undefined

v.object({
  name: v.string(),
  email: v.string().optional(), // Optional field
});
```

### Default Validation Behavior

::: tip 💡 All Schemas Reject `null` and `undefined` by Default
You don't need a `required()` method! Every schema already validates that values are not `null` or `undefined`.

```ts
v.string().parse(null); // ❌ Throws "Expected string"
v.number().parse(undefined); // ❌ Throws "Expected number"
v.array(v.string()).parse(null); // ❌ Throws "Expected array"
```

:::

**To allow optional values**, use `.optional()`:

```ts
v.string().optional(); // string | undefined
v.number().optional(); // number | undefined
```

**To reject empty strings or arrays**, use `.min(1)`:

```ts
v.string().min(1); // Rejects "" (empty string)
v.string().min(1, 'Name is required'); // Custom error message

v.array(v.string()).min(1); // Rejects [] (empty array)
v.array(v.string()).min(1, 'At least one item required');
```

**Example in forms:**

```ts
v.object({
  name: v.string().min(1, 'Name is required'), // Non-empty string
  email: v.string().email(), // Email format
  age: v.number().optional(), // Optional number
});
```

### nullable()

Makes a schema accept `null`.

```ts
v.string().nullable(); // string | null
v.number().nullable(); // number | null
```

### nullish()

Combines `.optional().nullable()` — accepts `null` or `undefined`.

```ts
v.string().nullish(); // string | null | undefined
v.number().nullish(); // number | null | undefined

v.object({
  bio: v.string().nullish(), // present, absent, or explicitly null
});
```

### required()

Removes `undefined` from the output type. Reverses `.optional()`. Also available as a factory shorthand `v.required(schema)`.

```ts
// On any schema
v.string().optional().required(); // string (not string | undefined)

// On objects — removes optional from every field
v.object({ name: v.string().optional() }).required();
// { name: string }  (field is now required)
```

### default()

Provides a default value for `undefined`.

```ts
v.string().default('hello'); // Returns 'hello' if undefined
v.number().default(0); // Returns 0 if undefined
v.boolean().default(false); // Returns false if undefined

v.object({
  theme: v.union(v.literal('light'), v.literal('dark')).default('light' as 'light' | 'dark'),
  language: v.string().default('en'),
});
```

## Custom Refinements

### refine() – Sync only

Adds a synchronous custom validator. **Throws at definition time** if given an async function — use `refineAsync()` for that.

The `message` parameter accepts a `string` **or** a `MessageFn` that receives `{ value }` at runtime for dynamic messages:

```ts
// Static message
v.string().refine((val) => val.length >= 3, 'Must be at least 3 characters');

// Dynamic message via MessageFn
v.string().refine(
  (val) => val.length >= 3,
  ({ value }) => `'${value}' is too short — need at least 3 characters`,
);

// Multiple refinements
v.string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine((val) => /[0-9]/.test(val), 'Must contain number');

// Object-level cross-field validation
v.object({
  password: v.string(),
  confirmPassword: v.string(),
}).refine((data) => data.password === data.confirmPassword, 'Passwords must match');
```

### refineAsync() – Async

Adds an async custom validator. Schemas with async validators **must** use `parseAsync()` or `safeParseAsync()`; calling `parse()` throws.

The `message` parameter accepts a static `string` or a `MessageFn<{ value: Output }>` for dynamic messages (same as `refine()`).

```ts
// Async refinement — must use parseAsync / safeParseAsync
v.string().email().refineAsync(async (email) => {
  const exists = await db.users.findOne({ email });
  return !exists;
}, ({ value }) => `The email address '${value}' is already registered`);

// Async cross-field validation on object
v.object({ name: v.string() }).refineAsync(async (data) => {
  return !(await db.exists(data.name));
}, 'Name already taken');
```

## Error Handling

### ValidationError

All validation errors are instances of `ValidationError`.

```ts
import { ValidationError } from '@vielzeug/validit';

try {
  schema.parse(data);
} catch (error) {
  if (ValidationError.is(error)) { // typesafe static check
    // Access all issues
    error.issues.forEach((issue) => {
      console.log(issue.path); // ['user', 'email']
      console.log(issue.message); // 'Invalid email'
      console.log(issue.code); // e.g. 'invalid_string', 'too_small'
      console.log(issue.params); // additional parameters
    });

    // Formatted message string
    console.log(error.message);
    // "user.email: Invalid email address [invalid_string]"
  }
}
```

### Flattening Errors

`flatten()` turns all issues into a form-friendly structure:

```ts
const result = userSchema.safeParse(formData);
if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
  // fieldErrors — Record<string, string[]>: per-field error lists
  //   e.g. { email: ['Invalid email'], name: ['Name is required'] }
  // formErrors — string[]: errors NOT attached to any specific field
  //   (usually from top-level .refine() calls)
  //   e.g. ['Passwords must match']
}
```

### Issue Object

Each issue contains:

```ts
type Issue = {
  path: (string | number)[]; // Field path
  message: string; // Error message
  code?: string; // Error code (for i18n)
  params?: Record<string, unknown>; // Additional parameters
};
```

### Safe Parsing

Use `safeParse()` to avoid try/catch:

```ts
const result = schema.safeParse(data);

if (!result.success) {
  // Handle errors
  result.error.issues.forEach((issue) => {
    showError(issue.path.join('.'), issue.message);
  });
} else {
  // Use data
  console.log(result.data);
}
```

## Type Inference

### Basic Inference

```ts
import { type Infer } from '@vielzeug/validit';

const schema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.string().email(),
});

type User = Infer<typeof schema>;
// { id: number; name: string; email: string }
```

### With Modifiers

```ts
const schema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.string().email().optional(),
  age: v.number().nullable(),
  role: v.union(v.literal('admin'), v.literal('user')).default('user' as 'admin' | 'user'),
});

type User = Infer<typeof schema>;
// {
//   id: number;
//   name: string;
//   email?: string | undefined;
//   age: number | null;
//   role: 'admin' | 'user';
// }
```

### Complex Types

```ts
const schema = v.object({
  user: v.object({
    name: v.string(),
    contacts: v.array(
      v.object({
        type: v.union(v.literal('email'), v.literal('phone')),
        value: v.string(),
      }),
    ),
  }),
  settings: v
    .object({
      theme: v.union(v.literal('light'), v.literal('dark')),
    })
    .optional(),
});

type Data = Infer<typeof schema>;
// {
//   user: {
//     name: string;
//     contacts: Array<{
//       type: 'email' | 'phone';
//       value: string;
//     }>;
//   };
//   settings?: {
//     theme: 'light' | 'dark';
//   };
// }
```

## Recursive Schemas

Use `v.lazy()` to define schemas that reference themselves (e.g. tree structures, nested comments).

```ts
import { v, type Schema, type Infer } from '@vielzeug/validit';

type Category = {
  name: string;
  subcategories: Category[];
};

const CategorySchema: Schema<Category> = v.lazy(() =>
  v.object({
    name: v.string(),
    subcategories: v.array(CategorySchema),
  }),
);

CategorySchema.parse({ name: 'Root', subcategories: [{ name: 'Child', subcategories: [] }] });
```

## Class Validation

Use `v.instanceof()` to validate class instances.

```ts
class File {
  constructor(
    public name: string,
    public size: number,
  ) {}
}

const FileSchema = v.object({
  file: v.instanceof(File),
  label: v.string(),
});

FileSchema.parse({ file: new File('photo.png', 2048), label: 'Profile picture' });
```


## Factory Shorthands

`v.optional()`, `v.nullable()`, and `v.nullish()` are convenience factory functions:

```ts
v.optional(v.string()); // same as v.string().optional()
v.nullable(v.string()); // same as v.string().nullable()
v.nullish(v.string());  // same as v.string().nullish()
```

These are particularly useful when composing schemas inline:

```ts
const fields = [v.optional(v.string()), v.nullable(v.number())];
```

## Best Practices

### ✅ Do

- Chain string/number methods (`.email()`, `.int().positive()`)
- Add custom error messages for better UX
- Use `safeParse()` for user input
- Leverage type inference with `Infer<typeof schema>`

### ❌ Don't

- Don't use `parse()` with async validators (use `parseAsync()`)
- Don't create overly complex nested schemas
- Don't forget to handle validation errors
- Don't use `any` types – let inference work

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
