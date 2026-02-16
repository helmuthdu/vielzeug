<PackageBadges package="validit" />

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
  email: v.email(),
  age: v.number().int().min(18),
});

// Automatic validation + type inference
const user = userSchema.parse(data);
// Type: { email: string; age: number }
```

### Comparison with Alternatives

| Feature             | Validit                                               | Zod    | Yup    |
| ------------------- | ----------------------------------------------------- | ------ | ------ |
| Bundle Size         | **<PackageInfo package="validit" type="size" />**     | ~12 KB | ~15 KB |
| Dependencies        | <PackageInfo package="validit" type="dependencies" /> | 0      | Many   |
| TypeScript          | Native                                                | Native | Good   |
| Async Validation    | ✅                                                    | ✅     | ✅     |
| Parallel Arrays     | ✅                                                    | ❌     | ❌     |
| Convenience Schemas | ✅                                                    | ❌     | ❌     |
| Transform Support   | ✅                                                    | ✅     | ✅     |
| Custom Refinements  | ✅                                                    | ✅     | ✅     |

## When to Use Validit

✅ **Use Validit when you need:**

- Type-safe runtime validation
- Async validation with database checks
- Parallel array validation for performance
- Minimal bundle size (<PackageInfo package="validit" type="size" />)
- Framework-agnostic solution
- Clean, readable schemas

❌ **Don't use Validit when:**

- You need brand types (use Zod)
- You want preprocessing hooks (use Zod)
- You need deeply nested recursive schemas

## 🚀 Key Features

- **Async Validation**: Built-in support for [asynchronous rules and database checks](./usage.md#async-validation).
- **Convenience Schemas**: Pre-built schemas for [common patterns](./api.md#factory-object-v) save you time and code.
- **Error Handling**: Structured [ValidationError](./usage.md#error-handling) with precise path and error code information.
- **Lightweight & Fast**: <PackageInfo package="validit" type="dependencies" /> dependencies and only **<PackageInfo package="validit" type="size" /> gzipped**. Optimized for both bundle size and [runtime performance](./api.md#performance-tips).
- **Transform Support**: Apply [transformations after validation](./usage.md#modifiers) for data normalization.
- **Type-Safe**: Full TypeScript support with [automatic type inference](./usage.md#type-inference) from your schemas.

## 📖 Core Concepts

### Default Validation Behavior

::: tip 💡 Everything is Required by Default
**All schemas reject `null` and `undefined` automatically** – you don't need a "required" method!

```ts
v.string().parse(null); // ❌ Throws "Expected string"
v.number().parse(undefined); // ❌ Throws "Expected number"
```

:::

**To make fields optional:**

```ts
v.string().optional(); // string | undefined
v.number().optional(); // number | undefined
```

**To reject empty values:**

```ts
v.string().min(1); // Rejects "" (empty string)
v.array(v.string()).min(1); // Rejects [] (empty array)
```

**Example form schema:**

```ts
const schema = v.object({
  name: v.string().min(1, 'Name is required'), // Non-empty string
  email: v.email(), // Non-empty email
  age: v.number().optional(), // Optional field
});
```

## 🏁 Quick Start

### Installation

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

### Basic Example

```ts
import { v } from '@vielzeug/validit';

const userSchema = v.object({
  email: v.email(),
  age: v.number().int().min(18),
});

// Validate and get typed data
const user = userSchema.parse(data);
```

### Form Validation

```ts
import { v, type Infer } from '@vielzeug/validit';

const registrationSchema = v.object({
  username: v
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/),
  email: v.email(),
  password: v
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
    .refine((val) => /[0-9]/.test(val), 'Must contain number'),
  age: v.int().positive().min(13, 'Must be at least 13 years old'),
});

type Registration = Infer<typeof registrationSchema>;

const result = registrationSchema.safeParse(formData);
if (!result.success) {
  result.error.issues.forEach((issue) => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

### API Response Validation

```ts
const apiResponseSchema = v.object({
  success: v.boolean(),
  data: v.object({
    id: v.int().positive(),
    name: v.string(),
    email: v.email(),
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

  return apiResponseSchema.parse(json);
}
```

### Async Username Check

```ts
const usernameSchema = v
  .string()
  .min(3)
  .max(20)
  .refineAsync(async (username) => {
    const available = await checkAvailability(username);
    return available;
  }, 'Username already taken');

const result = await usernameSchema.safeParseAsync('john_doe');
```

## 🎓 Core Concepts

### Schemas

Schemas define the shape and constraints of your data:

```ts
const stringSchema = v.string(); // Any string
const emailSchema = v.email(); // Email validation
const numberSchema = v.number().min(0); // Number >= 0
const arraySchema = v.array(v.string()); // Array of strings
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

## 📚 Documentation

Explore comprehensive guides and references:

- **[Usage Guide](./usage.md)** – Complete guide to all validation features
- **[API Reference](./api.md)** – Detailed API documentation with all methods
- **[Examples](./examples.md)** – Real-world examples and patterns
- **[Interactive REPL](/repl)**: Try it in your browser

## ❓ FAQ

### **Q: How does Validit compare to Zod?**

Validit is designed to be smaller (~2KB vs ~12KB) and focuses on simplicity. Zod offers more advanced features like brand types and preprocessing.

### **Q: Can I use Validit with React?**

Yes! Validit is framework-agnostic and works great with React, Vue, Svelte, or any JavaScript framework.

### **Q: Does Validit support async validation?**

Yes, use `refineAsync()` for async validations and `parseAsync()` or `safeParseAsync()` to execute them.

### **Q: Can I create custom validators?**

Yes, use `refine()` for sync validators or `refineAsync()` for async validators:

```ts
const schema = v.string().refine((val) => val.length > 5, 'Must be longer than 5 characters');
```

## 🐛 Troubleshooting

### **Validation always fails**

Check that your data matches the schema type. Use `safeParse()` to see detailed error messages:

```ts
const result = schema.safeParse(data);
if (!result.success) {
  console.log(result.error.issues);
}
```

### **Type inference not working**

Make sure you're using `type Infer` from validit:

```ts
import { v, type Infer } from '@vielzeug/validit';

const schema = v.object({ name: v.string() });
type Data = Infer<typeof schema>;
```

### **Async validation not running**

Use `parseAsync()` or `safeParseAsync()` instead of `parse()`:

```ts
// ❌ Won't run async validators
const result = schema.parse(data);

// ✅ Runs async validators
const result = await schema.parseAsync(data);
```

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md).

## 📄 License

MIT © [Vielzeug Contributors](https://github.com/helmuthdu/vielzeug/graphs/contributors)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/validit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/validit/CHANGELOG.md)
