<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2.0_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Dependencies">
</div>

<img src="/logo-validit.svg" alt="Validit Logo" width="156" class="logo-highlight"/>

# Validit

**Validit** is a lightweight, type-safe schema validation library for TypeScript. Build robust validation with minimal code, async support, and automatic type inference.

## What Problem Does Validit Solve?

Validating user input, API responses, and configuration data is critical but often verbose and error-prone. Validit provides a clean, type-safe API for building validation schemas with full TypeScript support.

**Traditional Approach**:

```ts
// Manual validation
function validateUser(data: unknown) {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    throw new Error('Expected object');
  }
  
  const user = data as Record<string, unknown>;
  
  if (typeof user.email !== 'string' || !user.email.includes('@')) {
    errors.push('Invalid email');
  }
  
  if (typeof user.age !== 'number' || user.age < 18) {
    errors.push('Must be at least 18');
  }
  
  if (errors.length) throw new Error(errors.join(', '));
  
  return user as { email: string; age: number };
}
```

**With Validit**:

```ts
import { v } from '@vielzeug/validit';

const userSchema = v.object({
  email: v.email().required(),
  age: v.number().int().min(18).required(),
});

// Automatic validation + type inference
const user = userSchema.parse(data);
// Type: { email: string; age: number }
```

### Comparison with Alternatives

| Feature                   | Validit   | Zod       | Yup       |
| ------------------------- | --------- | --------- | --------- |
| Bundle Size               | **2.0 KB** | ~12 KB    | ~15 KB    |
| Dependencies              | 0         | 0         | Many      |
| TypeScript                | Native    | Native    | Good      |
| Async Validation          | ✅        | ✅        | ✅        |
| Parallel Arrays           | ✅        | ❌        | ❌        |
| Convenience Schemas       | ✅        | ❌        | ❌        |
| Transform Support         | ✅        | ✅        | ✅        |
| Custom Refinements        | ✅        | ✅        | ✅        |

## When to Use Validit

✅ **Use Validit when you need:**

- Type-safe runtime validation
- Async validation with database checks
- Parallel array validation for performance
- Minimal bundle size (2 KB)
- Framework-agnostic solution
- Clean, readable schemas

❌ **Don't use Validit when:**

- You need brand types (use Zod)
- You want preprocessing hooks (use Zod)
- You need deeply nested recursive schemas

## 🚀 Key Features

### ⚡ Lightweight & Fast

Zero dependencies and only **~2 KB gzipped**. Optimized for both bundle size and runtime performance.

```ts
import { v } from '@vielzeug/validit';
// That's it - no other imports needed
```

### 🎯 Type-Safe

Full TypeScript support with automatic type inference from your schemas.

```ts
const schema = v.object({
  id: v.positiveInt(),
  email: v.email(),
  role: v.oneOf('admin', 'user', 'guest'),
});

type User = Infer<typeof schema>;
// { id: number; email: string; role: 'admin' | 'user' | 'guest' }
```

### 🔄 Async Validation

Full async support for database checks, API calls, and complex validations.

```ts
const schema = v.string()
  .email()
  .refineAsync(async (email) => {
    const exists = await checkDatabase(email);
    return !exists;
  }, 'Email already registered');

await schema.parseAsync('user@example.com');
```

### ⚡ Parallel Array Processing

Validate large arrays efficiently with parallel processing.

```ts
const schema = v.array(
  v.object({
    id: v.number(),
    name: v.string(),
  }).refineAsync(async (item) => await validate(item)),
  { parallel: true } // Process all items concurrently
);

await schema.parseAsync(largeArray);
```

### 🎨 Convenience Schemas

Pre-built schemas for common patterns save you time and code.

```ts
v.email()        // Instead of v.string().email()
v.url()          // Instead of v.string().url()
v.uuid()         // UUID validation
v.positiveInt()  // Positive integers
v.negativeInt()  // Negative integers
```

### 🔧 Transform Support

Apply transformations after validation for data normalization.

```ts
const schema = v.string()
  .email()
  .transform(email => email.toLowerCase().trim());

schema.parse('  USER@EXAMPLE.COM  ');
// Returns: 'user@example.com'
```

## 📦 Installation

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

## 🎯 Quick Examples

### Form Validation

```ts
import { v, type Infer } from '@vielzeug/validit';

const registrationSchema = v.object({
  username: v.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required('Username is required'),
  email: v.email().required('Email is required'),
  password: v.string()
    .min(8)
    .refine(val => /[A-Z]/.test(val), 'Must contain uppercase')
    .refine(val => /[0-9]/.test(val), 'Must contain number')
    .required(),
  age: v.positiveInt().min(13).required(),
});

type Registration = Infer<typeof registrationSchema>;

const result = registrationSchema.safeParse(formData);
if (!result.success) {
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

### API Response Validation

```ts
const apiResponseSchema = v.object({
  success: v.boolean(),
  data: v.object({
    id: v.positiveInt(),
    name: v.string(),
    email: v.email(),
  }),
  meta: v.object({
    timestamp: v.date(),
    version: v.string(),
  }).optional(),
});

async function fetchData() {
  const response = await fetch('/api/data');
  const json = await response.json();
  
  return apiResponseSchema.parse(json);
}
```

### Async Username Check

```ts
const usernameSchema = v.string()
  .min(3)
  .max(20)
  .refineAsync(async (username) => {
    const available = await checkAvailability(username);
    return available;
  }, 'Username already taken');

const result = await usernameSchema.safeParseAsync('john_doe');
```

## 📚 Core Concepts

### Schemas

Schemas define the shape and constraints of your data:

```ts
const stringSchema = v.string();           // Any string
const emailSchema = v.email();             // Email validation
const numberSchema = v.number().min(0);    // Number >= 0
const arraySchema = v.array(v.string());   // Array of strings
```

### Validation

Two ways to validate: `parse()` (throws) or `safeParse()` (returns result):

```ts
// Throws ValidationError on failure
const user = schema.parse(data);

// Returns success/error result
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

### Type Inference

TypeScript types are automatically inferred from schemas:

```ts
const schema = v.object({
  id: v.number(),
  name: v.string(),
  tags: v.array(v.string()).optional(),
});

type Data = Infer<typeof schema>;
// { id: number; name: string; tags?: string[] }
```

## 🎓 Learn More

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Next Steps</p>
    <ul>
      <li><a href="./usage">Usage Guide</a> - Comprehensive guide to all features</li>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Real-world usage examples</li>
    </ul>
  </div>
</div>

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md).

## 📄 License

MIT © [Vielzeug Contributors](https://github.com/helmuthdu/vielzeug/graphs/contributors)

