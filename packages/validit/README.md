# @vielzeug/validit

Lightweight, type-safe schema validation for TypeScript. Build robust validation with minimal code and maximum type safety.

## Features

- ✅ **Type-Safe** - Full TypeScript support with automatic type inference
- ✅ **Zero Dependencies** - No external dependencies
- ✅ **Lightweight** - 2.8 KB gzipped
- ✅ **Intuitive API** - Inspired by Zod but simpler
- ✅ **Composable** - Build complex schemas from simple primitives
- ✅ **Async Validation** - Full support for async validators
- ✅ **Convenience Helpers** - Pre-built schemas for common patterns (email, URL, UUID, etc.)
- ✅ **Framework Agnostic** - Works anywhere JavaScript runs

## Installation

```bash
npm install @vielzeug/validit
```

## Quick Start

```typescript
import { v, type Infer } from '@vielzeug/validit';

// Define a schema with convenience helpers
const userSchema = v.object({
  id: v.positiveInt(), // Convenience: number().int().positive()
  name: v.string().min(1).max(100).required(),
  email: v.email().required(), // Convenience: string().email()
  age: v.number().int().min(18).optional(),
  role: v.oneOf('admin', 'user', 'guest'),
});

// Infer TypeScript type
type User = Infer<typeof userSchema>;
// {
//   id: number;
//   name: string;
//   email: string;
//   age?: number | undefined;
//   role: 'admin' | 'user' | 'guest';
// }

// Validate data
const user = userSchema.parse({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
}); // ✅ Returns typed data

// Safe parse (no exceptions)
const result = userSchema.safeParse(data);
if (result.success) {
  console.log(result.data); // Typed user data
} else {
  console.error(result.error.issues); // Validation errors
}
```

## API Reference

### Convenience Schemas

Pre-configured schemas for common patterns:

```typescript
v.email(); // Email validation (string().email())
v.url(); // URL validation (string().url())
v.uuid(); // UUID validation
v.positiveInt(); // Positive integer (number().int().positive())
v.negativeInt(); // Negative integer (number().int().negative())
```

### Primitives

#### String

```typescript
v.string() // string
  .min(3) // min length
  .max(100) // max length
  .length(10) // exact length
  .pattern(/^[a-z]+$/) // regex pattern
  .email() // email validation
  .url() // URL validation
  .trim(); // trim whitespace
```

#### Number

```typescript
v.number() // number
  .min(0) // minimum value
  .max(100) // maximum value
  .int() // integer only
  .positive() // > 0
  .negative(); // < 0
```

#### Boolean

```typescript
v.boolean(); // boolean
```

#### Date

```typescript
v.date() // Date object
  .min(new Date('2020-01-01')) // minimum date
  .max(new Date()); // maximum date
```

### Literals & Enums

```typescript
v.literal('active'); // Exact value
v.enum('red', 'green', 'blue'); // One of values
```

### Complex Types

#### Array

```typescript
v.array(v.string()) // string[]
  .min(1) // min items
  .max(10) // max items
  .length(5) // exact length
  .nonempty(); // at least 1 item
```

#### Object

```typescript
v.object({
  name: v.string(),
  age: v.number(),
})
  .partial() // Make all fields optional
  .pick('name') // Select specific fields
  .omit('age'); // Exclude specific fields
```

#### Union

```typescript
v.union(v.string(), v.number()); // string | number
```

### Modifiers

```typescript
schema.optional(); // T | undefined
schema.required(); // Explicitly mark as required (opposite of optional)
schema.nullable(); // T | null
schema.default(value); // T with default value
schema.refine(check, msg); // Custom sync validation
schema.describe('name'); // Add description for better error messages
```

### Async Validation

Full async support for all validation needs:

```typescript
// Async refinements
const schema = v.string().refineAsync(async (val) => {
  const exists = await checkDatabase(val);
  return !exists;
}, 'Already exists');

// Must use parseAsync for async validators
const result = await schema.parseAsync(value);

// Safe async parse
const result = await schema.safeParseAsync(value);
if (result.success) {
  console.log(result.data);
}
```

## Usage Examples

### Form Validation

```typescript
const registrationSchema = v.object({
  username: v
    .string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required('Username is required'),
  email: v.email().required('Email is required'),
  password: v
    .string()
    .min(8)
    .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
    .refine((val) => /[0-9]/.test(val), 'Must contain number')
    .required(),
  age: v.positiveInt().min(13).required(),
  terms: v
    .boolean()
    .refine((val) => val === true, 'Must accept terms')
    .required(),
});

type RegistrationData = Infer<typeof registrationSchema>;

const result = registrationSchema.safeParse(formData);
if (!result.success) {
  // Show validation errors
  result.error.issues.forEach((issue) => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

### API Response Validation

```typescript
const apiResponseSchema = v.object({
  success: v.boolean(),
  data: v.object({
    id: v.number(),
    name: v.string(),
    email: v.string().email(),
  }),
  meta: v
    .object({
      timestamp: v.date(),
      version: v.string(),
    })
    .optional(),
});

async function fetchData() {
  const response = await fetch('/api/data');
  const json = await response.json();

  // Validate and get typed data
  return apiResponseSchema.parse(json);
}
```

### Configuration Schema

```typescript
const configSchema = v.object({
  apiKey: v.string().min(32),
  environment: v.enum('dev', 'staging', 'prod'),
  timeout: v.number().int().min(1000).default(5000),
  retries: v.number().int().min(0).max(5).default(3),
  features: v.object({
    auth: v.boolean().default(true),
    analytics: v.boolean().default(false),
  }),
});

type Config = Infer<typeof configSchema>;
```

### Nested Object Validation

```typescript
const addressSchema = v.object({
  street: v.string(),
  city: v.string(),
  zipCode: v.string().pattern(/^\d{5}$/),
});

const personSchema = v.object({
  name: v.string(),
  email: v.string().email(),
  address: addressSchema,
  billingAddress: addressSchema.optional(),
});
```

### Custom Refinements

```typescript
const passwordSchema = v
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Must contain at least one lowercase letter')
  .refine((val) => /[0-9]/.test(val), 'Must contain at least one number');

// Object-level refinement
const signupSchema = v
  .object({
    password: v.string(),
    confirmPassword: v.string(),
  })
  .refine((data) => data.password === data.confirmPassword, 'Passwords must match');
```

### Async Validation Examples

```typescript
// Username availability check
const usernameSchema = v
  .string()
  .min(3)
  .refineAsync(async (username) => {
    const available = await checkUsernameAvailability(username);
    return available;
  }, 'Username already taken');

// Must use parseAsync
const result = await usernameSchema.safeParseAsync('john_doe');

// Combining sync and async validations
const emailSchema = v
  .email() // Sync validation
  .refineAsync(async (email) => {
    const exists = await checkEmailInDatabase(email);
    return !exists;
  }, 'Email already registered'); // Async validation

// Object with async validation
const userSchema = v
  .object({
    email: v.email(),
    username: v.string().min(3),
  })
  .refineAsync(async (data) => {
    const valid = await validateUserData(data);
    return valid;
  }, 'Invalid user data');

await userSchema.parseAsync({ email: 'test@example.com', username: 'john' });

// Parallel array validation for performance
const itemsSchema = v.array(
  v
    .object({
      id: v.positiveInt(),
      name: v.string(),
    })
    .refineAsync(async (item) => {
      return await validateItem(item);
    }, 'Invalid item'),
);

await itemsSchema.parseAsync(items);
```

### Union Types

```typescript
// Discriminated union
const resultSchema = v.union(
  v.object({
    success: v.literal(true),
    data: v.string(),
  }),
  v.object({
    success: v.literal(false),
    error: v.string(),
  }),
);

type Result = Infer<typeof resultSchema>;
// { success: true; data: string } | { success: false; error: string }
```

## Error Handling

```typescript
import { ValidationError } from '@vielzeug/validit';

try {
  schema.parse(data);
} catch (error) {
  if (error instanceof ValidationError) {
    error.issues.forEach((issue) => {
      console.log(`Path: ${issue.path.join('.')}`);
      console.log(`Message: ${issue.message}`);
    });
  }
}

// Or use safeParse to avoid exceptions
const result = schema.safeParse(data);
if (!result.success) {
  result.error.issues; // Array of validation issues
}
```

## Type Inference

```typescript
import { type Infer } from '@vielzeug/validit';

const schema = v.object({
  id: v.number(),
  name: v.string(),
  tags: v.array(v.string()).optional(),
});

type Data = Infer<typeof schema>;
// {
//   id: number;
//   name: string;
//   tags?: string[] | undefined;
// }
```

## Comparison with Zod

validit is inspired by Zod but focuses on simplicity and smaller bundle size:

| Feature                   | validit    | Zod    |
| ------------------------- | ---------- | ------ |
| Bundle Size (gzipped)     | ~2 KB      | ~12 KB |
| Type Inference            | ✅         | ✅     |
| Basic Validation          | ✅         | ✅     |
| Custom Refinements        | ✅         | ✅     |
| Async Validation          | ✅         | ✅     |
| Parallel Array Validation | ✅         | ❌     |
| Convenience Schemas       | ✅         | ❌     |
| Transformers              | ✅ (basic) | ✅     |
| Preprocess                | ❌         | ✅     |
| Coercion                  | ✅ (basic) | ✅     |
| Brand Types               | ❌         | ✅     |
| Discriminated Unions      | ✅         | ✅     |

If you need advanced features like brand types, use Zod. If you want a lightweight alternative with the essentials plus async validation, use validit.

## Performance & Code Quality

validit is designed with performance and maintainability in mind:

### **Efficient Validation**

```typescript
// Validate arrays with async validators
const schema = v.array(
  v.object({ id: v.number(), data: v.string() }).refineAsync(async (item) => await validateItem(item)),
);

// Much faster for large datasets
await schema.parseAsync(largeArray);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
