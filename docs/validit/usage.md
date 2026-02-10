# Validit Usage Guide

Complete guide to installing and using Validit in your projects.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/validit
```

```sh [npm]
npm install @vielzeug/validit
```

```sh [yarn]
yarn add @vielzeug/validit
```

:::

## Import

```ts
import { v, type Infer } from '@vielzeug/validit';
// Optional: Import types
import type { Schema, ValidationError, ParseResult } from '@vielzeug/validit';
```

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

- [Basic Usage](#basic-usage)
- [Primitive Schemas](#primitive-schemas)
- [Complex Schemas](#complex-schemas)
- [Validation Methods](#validation-methods)
- [Async Validation](#async-validation)
- [Modifiers](#modifiers)
- [Custom Refinements](#custom-refinements)
- [Error Handling](#error-handling)
- [Type Inference](#type-inference)

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
// Parse - throws on error
const data = schema.parse(input);

// Safe parse - returns result
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

---

## Primitive Schemas

### String

```ts
// Basic string
v.string()

// With validation
v.string()
  .min(3)                              // Min length
  .max(100)                            // Max length
  .length(10)                          // Exact length
  .pattern(/^[a-z]+$/)                 // Regex pattern
  .email()                             // Email format
  .url()                               // URL format
  .trim()                              // Must be trimmed

// Convenience helpers
v.email()                              // Shorthand for v.string().email()
v.url()                                // Shorthand for v.string().url()
v.uuid()                               // UUID validation
```

### Number

```ts
// Basic number
v.number()

// With validation
v.number()
  .min(0)                              // Minimum value
  .max(100)                            // Maximum value
  .int()                               // Must be integer
  .positive()                          // Must be > 0
  .negative()                          // Must be < 0

// Convenience helpers
v.positiveInt()                        // Shorthand for v.number().int().positive()
v.negativeInt()                        // Shorthand for v.number().int().negative()
```

### Boolean

```ts
v.boolean()                            // true or false
```

### Date

```ts
v.date()                               // Date object
  .min(new Date('2020-01-01'))         // After date
  .max(new Date())                     // Before date
```

### Literal

```ts
v.literal('active')                    // Exactly 'active'
v.literal(42)                          // Exactly 42
v.literal(true)                        // Exactly true
```

### Enum

```ts
v.oneOf('red', 'green', 'blue')        // One of these values
v.oneOf(1, 2, 3)                       // One of these numbers
v.oneOf('admin', 'user', 'guest')      // Union of literals
```

---

## Complex Schemas

### Arrays

```ts
// Array of strings
v.array(v.string())

// With constraints
v.array(v.string())
  .min(1)                              // At least 1 item
  .max(10)                             // At most 10 items
  .length(5)                           // Exactly 5 items
  .nonempty()                          // At least 1 item

// Nested arrays
v.array(v.array(v.number()))           // number[][]

// Parallel validation (async)
v.array(v.string(), { parallel: true })
```

### Objects

```ts
// Basic object
v.object({
  name: v.string(),
  age: v.number(),
})

// Nested objects
v.object({
  user: v.object({
    name: v.string(),
    email: v.email(),
  }),
  settings: v.object({
    notifications: v.boolean(),
  }),
})

// Object methods
schema.partial()                       // Make all fields optional
schema.pick('name', 'email')           // Select specific fields
schema.omit('password')                // Exclude specific fields
```

### Union

```ts
// Union of primitives
v.union(v.string(), v.number())        // string | number

// Discriminated union
v.union(
  v.object({
    type: v.literal('success'),
    data: v.string(),
  }),
  v.object({
    type: v.literal('error'),
    error: v.string(),
  }),
)
```

---

## Validation Methods

### parse()

Validates and returns data, throws `ValidationError` on failure.

```ts
try {
  const user = userSchema.parse(data);
  console.log(user); // Typed data
} catch (error) {
  if (error instanceof ValidationError) {
    error.issues.forEach(issue => {
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

---

## Async Validation

### parseAsync()

For schemas with async validators.

```ts
const schema = v.string()
  .email()
  .refineAsync(async (email) => {
    const exists = await checkDatabase(email);
    return !exists;
  }, 'Email already exists');

try {
  const email = await schema.parseAsync('user@example.com');
} catch (error) {
  console.error(error.issues);
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
  v.object({
    id: v.number(),
    name: v.string(),
  }).refineAsync(async (item) => {
    return await validateItem(item);
  }),
  { parallel: true } // Validate all items in parallel
);

const items = await schema.parseAsync(largeArray);
```

---

## Modifiers

### optional()

Makes a schema accept `undefined`.

```ts
v.string().optional()                  // string | undefined
v.email().optional()                   // string | undefined

v.object({
  name: v.string(),
  email: v.string().optional(),        // Optional field
})
```

### required()

Explicitly marks a field as required (opposite of optional).

```ts
v.string().required()                  // Rejects null/undefined
v.string().required('Name is required') // Custom error message

v.object({
  name: v.string().required(),
  email: v.email().required('Email is required'),
})
```

### nullable()

Makes a schema accept `null`.

```ts
v.string().nullable()                  // string | null
v.number().nullable()                  // number | null
```

### default()

Provides a default value for `undefined`.

```ts
v.string().default('hello')            // Returns 'hello' if undefined
v.number().default(0)                  // Returns 0 if undefined
v.boolean().default(false)             // Returns false if undefined

v.object({
  theme: v.oneOf('light', 'dark').default('light'),
  language: v.string().default('en'),
})
```

### describe()

Adds a description for better error messages.

```ts
v.number()
  .int()
  .min(0)
  .describe('age');

// Errors will show: "age: Must be at least 0"
// Instead of: "value: Must be at least 0"
```

---

## Custom Refinements

### refine() - Sync

Add custom validation logic.

```ts
// Simple refinement
v.string().refine(
  val => val.length >= 3,
  'Must be at least 3 characters'
)

// Multiple refinements
v.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine(val => /[0-9]/.test(val), 'Must contain number')

// Object-level validation
v.object({
  password: v.string(),
  confirmPassword: v.string(),
}).refine(
  data => data.password === data.confirmPassword,
  'Passwords must match'
)
```

### refineAsync() - Async

Add async validation (database checks, API calls).

```ts
// Username availability
v.string()
  .min(3)
  .refineAsync(async (username) => {
    const available = await checkAvailability(username);
    return available;
  }, 'Username already taken');

// Email validation with database
v.email()
  .refineAsync(async (email) => {
    const exists = await db.users.findOne({ email });
    return !exists;
  }, 'Email already registered');

// Combine sync and async
v.string()
  .min(3)                              // Sync
  .refine(val => /^[a-z]+$/.test(val), 'Only lowercase') // Sync
  .refineAsync(async (val) => {        // Async
    return await isUnique(val);
  }, 'Already exists');
```

---

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
    error.issues.forEach(issue => {
      console.log(issue.path);     // ['user', 'email']
      console.log(issue.message);  // 'Invalid email'
      console.log(issue.code);     // 'invalid_email'
      console.log(issue.params);   // { expected: 'email' }
    });

    // Formatted message
    console.log(error.message);
    // "user.email: Invalid email [invalid_email]"
  }
}
```

### Issue Object

Each issue contains:

```ts
type Issue = {
  path: (string | number)[];           // Field path
  message: string;                     // Error message
  code?: string;                       // Error code (for i18n)
  params?: Record<string, unknown>;    // Additional parameters
};
```

### Safe Parsing

Use `safeParse()` to avoid try/catch:

```ts
const result = schema.safeParse(data);

if (!result.success) {
  // Handle errors
  result.error.issues.forEach(issue => {
    showError(issue.path.join('.'), issue.message);
  });
} else {
  // Use data
  console.log(result.data);
}
```

---

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
  role: v.oneOf('admin', 'user').default('user'),
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
    contacts: v.array(v.object({
      type: v.oneOf('email', 'phone'),
      value: v.string(),
    })),
  }),
  settings: v.object({
    theme: v.oneOf('light', 'dark'),
  }).optional(),
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

---

## Best Practices

### ✅ Do

- Use convenience schemas (`v.email()`, `v.positiveInt()`)
- Add custom error messages for better UX
- Use `safeParse()` for user input
- Leverage type inference with `Infer<typeof schema>`
- Use `describe()` for complex nested schemas
- Enable parallel validation for large arrays

### ❌ Don't

- Don't use `parse()` with async validators (use `parseAsync()`)
- Don't create overly complex nested schemas
- Don't forget to handle validation errors
- Don't use `any` types - let inference work

---

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Real-world usage examples</li>
    </ul>
  </div>
</div>

