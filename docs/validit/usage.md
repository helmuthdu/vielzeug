---
title: Validit — Usage Guide
description: Schema types, chaining, coercion, and advanced validation patterns for Validit.
---

# Validit Usage Guide

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
const UserSchema = v.object({ name: v.string(), email: v.email(), age: v.number().min(0) });
const user = UserSchema.parse(raw);
```

| Feature | Validit | Zod | Yup |
|---|---|---|---|
| Bundle size | <PackageInfo package="validit" type="size" /> | ~14 kB | ~22 kB |
| TypeScript inference | ✅ | ✅ | ⚠️ |
| Async validation | ✅ | ✅ | ✅ |
| Coercion | ✅ | ✅ | ✅ |
| Zero dependencies | ✅ | ✅ | ❌ |

**Use Validit when** you want schema validation with full TS inference and minimal bundle size.

**Consider Zod** if you need its ecosystem (trpc, drizzle, react-hook-form integration) or its error formatting API.


## Import

```ts
import { v, type Infer } from '@vielzeug/validit';
// Optional: Import types
import type { Schema, ValidationError, ParseResult } from '@vielzeug/validit';
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
  email: v.email(),
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
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    'Must contain uppercase letter and number'
  );
```

### Conditional Validation

Apply validation rules based on other field values:

```ts
const schema = v.object({
  type: v.oneOf(v.literal('email'), v.literal('phone')),
  contact: v.string(),
}).refine((data) => {
  if (data.type === 'email') {
    return /^[^@]+@[^@]+$/.test(data.contact);
  }
  return /^\d{10}$/.test(data.contact);
}, 'Invalid contact format');
```

### Async Validation

Validate against external services or databases:

```ts
const emailSchema = v.string().email().refine(
  async (email) => {
    const response = await fetch(`/api/check-email?email=${email}`);
    const { available } = await response.json();
    return available;
  },
  'Email already taken',
);

// Use with parseAsync
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
  .min(3)        // Min length
  .max(100)      // Max length
  .length(10)    // Exact length
  .nonempty()    // Shorthand for .min(1)
  .startsWith('https', 'Must be a secure URL')
  .endsWith('.ts', 'TypeScript files only')
  .pattern(/^[a-z]+$/) // Regex pattern
  .email()       // Email format
  .url()         // URL format
  .trim();       // Trim whitespace before validation

// Convenience helpers
v.email();  // Shorthand for v.string().email()
v.url();    // Shorthand for v.string().url()
v.uuid();   // UUID validation
```

### Number

```ts
// Basic number
v.number();

// With validation
v.number()
  .min(0)         // Minimum value
  .max(100)       // Maximum value
  .int()          // Must be integer
  .positive()     // Must be > 0
  .negative()     // Must be < 0
  .nonNegative()  // Must be >= 0 (alias for .min(0))
  .nonPositive()  // Must be <= 0 (alias for .max(0))
  .multipleOf(5); // Must be divisible by 5

// Convenience helpers
v.int();           // Shorthand for v.number().int()
v.int().positive(); // Positive integer
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

### Literals and Unions of Literals

```ts
// Exact value
v.literal('active'); // Exactly 'active'
v.literal(42);       // Exactly 42
v.literal(true);     // Exactly true

// Union of literals (use v.oneOf) — raw values are accepted as shorthand for v.literal()
v.oneOf('red', 'green', 'blue');     // 'red' | 'green' | 'blue'
v.oneOf('admin', 'user', 'guest');   // 'admin' | 'user' | 'guest'
```

## Complex Schemas

### Arrays

```ts
// Array of strings
v.array(v.string());

// With constraints
v.array(v.string())
  .nonempty()  // Rejects empty arrays (shorthand for .min(1))
  .min(1)      // At least 1 item
  .max(10)     // At most 10 items
  .length(5);  // Exactly 5 items

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
    email: v.email(),
  }),
  settings: v.object({
    notifications: v.boolean(),
  }),
});

// Object methods
schema.partial();              // Make all fields optional
schema.required();             // Remove optional from all fields
schema.pick('name', 'email');  // Select specific fields
schema.omit('password');       // Exclude specific fields
schema.extend({ role: v.string() }); // Add/override fields
schema.strip();                // Remove unknown keys (default)
schema.passthrough();          // Allow unknown keys through
schema.strict();               // Reject unknown keys
schema.shape;                  // Access raw shape definition
```

### Unions

```ts
// v.oneOf: exactly one branch must match (mutual exclusion)
v.oneOf('light', 'dark');         // 'light' | 'dark'
v.oneOf(v.string(), v.number()); // string | number

// Discriminated union
v.oneOf(
  v.object({ type: v.literal('success'), data: v.string() }),
  v.object({ type: v.literal('error'),   message: v.string() }),
);

// v.noneOf: passes when value matches NONE of the schemas (blocklist/exclusion)
v.noneOf('admin', 'system'); // any value except those two
v.noneOf(v.string(), v.number()); // accepts true, null, Date, etc. but not strings or numbers

// v.allOf: all schemas must pass (intersection / mixin)
v.allOf(
  v.object({ id: v.number() }),
  v.object({ name: v.string() }),
);
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
    .refine(async (item) => {
      return await validateItem(item);
    }),
);

const items = await schema.parseAsync(largeArray);
```

## Modifiers

### optional()

Makes a schema accept `undefined`.

```ts
v.string().optional(); // string | undefined
v.email().optional(); // string | undefined

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
  email: v.email(), // Non-empty email
  age: v.number().optional(), // Optional number
});
```

### nullable()

Makes a schema accept `null`.

```ts
v.string().nullable(); // string | null
v.number().nullable(); // number | null
```

### default()

Provides a default value for `undefined`.

```ts
v.string().default('hello'); // Returns 'hello' if undefined
v.number().default(0); // Returns 0 if undefined
v.boolean().default(false); // Returns false if undefined

v.object({
  theme: v.oneOf(v.literal('light'), v.literal('dark')).default('light' as 'light' | 'dark'),
  language: v.string().default('en'),
});
```

## Custom Refinements

### refine() – Sync and Async

Add custom validation logic. Pass an async function to defer to `parseAsync()`.

```ts
// Simple sync refinement
v.string().refine((val) => val.length >= 3, 'Must be at least 3 characters');

// Multiple refinements
v.string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine((val) => /[0-9]/.test(val), 'Must contain number');

// Object-level validation
v.object({
  password: v.string(),
  confirmPassword: v.string(),
}).refine((data) => data.password === data.confirmPassword, 'Passwords must match');

// Async refinement — detected automatically; use parseAsync / safeParseAsync
v.email().refine(async (email) => {
  const exists = await db.users.findOne({ email });
  return !exists;
}, 'Email already registered');
```

## Error Handling

### ValidationError

All validation errors are instances of `ValidationError`.

```ts
import { ValidationError } from '@vielzeug/validit';

try {
  schema.parse(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Access all issues
    error.issues.forEach((issue) => {
      console.log(issue.path); // ['user', 'email']
      console.log(issue.message); // 'Invalid email'
      console.log(issue.code); // e.g. 'invalid_string', 'too_small'
      console.log(issue.params); // additional parameters
    });

    // Formatted message
    console.log(error.message);
    // "user.email: Invalid email address [invalid_string]"
  }
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
  email: v.email(),
});

type User = Infer<typeof schema>;
// { id: number; name: string; email: string }
```

### With Modifiers

```ts
const schema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.email().optional(),
  age: v.number().nullable(),
  role: v.oneOf(v.literal('admin'), v.literal('user')).default('user' as 'admin' | 'user'),
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
        type: v.oneOf(v.literal('email'), v.literal('phone')),
        value: v.string(),
      }),
    ),
  }),
  settings: v
    .object({
      theme: v.oneOf(v.literal('light'), v.literal('dark')),
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
  constructor(public name: string, public size: number) {}
}

const FileSchema = v.object({
  file: v.instanceof(File),
  label: v.string(),
});

FileSchema.parse({ file: new File('photo.png', 2048), label: 'Profile picture' });
```

## pipe()

`pipe()` chains schemas in sequence: each schema's output feeds into the next as input. Useful for coerce → validate pipelines.

```ts
import { pipe, v } from '@vielzeug/validit';

// Accept a string, coerce it to a number, then apply number constraints
const portSchema = pipe(v.string(), v.coerce.number(), v.number().int().min(1024).max(65535));
portSchema.parse('3000'); // → 3000

// CSV string → array of trimmed strings
const tagsSchema = pipe(
  v.string(),
  v.string().transform((s) => s.split(',').map((t) => t.trim())),
);
```

## Best Practices

### ✅ Do

- Use convenience schemas (`v.email()`, `v.int().positive()`)
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
