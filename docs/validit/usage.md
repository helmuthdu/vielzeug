---
title: Validit — Usage Guide
description: Schema composition, validation flows, strict object behavior, and async patterns in Validit.
---

# Validit Usage Guide

[[toc]]

## Basic Usage

```ts
import { v } from '@vielzeug/validit';

const UserSchema = v.object({
  name: v.string().min(1),
  email: v.string().email(),
  age: v.number().int().min(18).optional(),
});

const parsed = UserSchema.parse(input);

const result = UserSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.flatten());
}
```

## v Namespace Factories

`v` is the canonical factory namespace.

```ts
v.string();
v.number();
v.boolean();
v.date();
v.literal('active');
v.enum(['draft', 'published'] as const);
v.nativeEnum(StatusEnum);
v.object({ id: v.number() });
v.array(v.string());
v.tuple([v.string(), v.number()] as const);
v.record(v.string(), v.number());
v.union(v.string(), v.number());
v.union('admin', 'editor', 'viewer');
v.intersect(v.object({ id: v.number() }), v.object({ createdAt: v.date() }));
v.variant('type', {
  ok: v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});
v.lazy(() => v.object({ next: v.null() }));
v.instanceof(Date);
v.never();
v.null();
v.undefined();
```

## Primitive Schemas

### Strings

```ts
v.string().min(3).max(40).nonEmpty();
v.string().email();
v.string().url();
v.string().uuid();
v.string().isoDate(); // YYYY-MM-DD
v.string().isoDateTime(); // ISO date-time
v.string().startsWith('user_').endsWith('_id').includes('_');
v.string().regex(/^[a-z0-9_-]+$/i);
v.string().trim().lowercase(); // preprocess before validation
```

### Numbers

```ts
v.number().int().min(0).max(100);
v.number().positive();
v.number().negative();
v.number().nonNegative();
v.number().nonPositive();
v.number().multipleOf(5);
```

### Other Primitives

```ts
v.boolean();
v.date().min(new Date('2024-01-01')).max(new Date());
v.literal('active');
v.enum(['draft', 'published'] as const);
v.nativeEnum(StatusEnum);
```

## Complex Schemas

### Objects, Arrays, Tuples, Records

```ts
const Profile = v.object({
  id: v.number().int().positive(),
  name: v.string().min(1),
  tags: v.array(v.string()).max(10),
  point: v.tuple([v.number(), v.number()] as const),
  meta: v.record(v.string(), v.string()).optional(),
});

// object() is strict by default (unknown keys fail)
const RelaxedProfile = Profile.relaxed();
```

### Union, Intersect, Variant

```ts
const Id = v.union(v.number(), v.string());
const Role = v.union('admin', 'editor', 'viewer');

const Timestamped = v.intersect(v.object({ id: v.number() }), v.object({ createdAt: v.date() }));

const ApiResult = v.variant('type', {
  ok: v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});
```

## Validation Methods

### parse and safeParse

```ts
try {
  UserSchema.parse(input);
} catch (error) {
  if (ValidationError.is(error)) {
    console.log(error.issues);
  }
}

const result = UserSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.issues);
}
```

### parseAsync and safeParseAsync

```ts
const UniqueEmail = v
  .string()
  .email()
  .refineAsync(async (value) => {
    const exists = await db.users.exists({ email: value });
    return !exists;
  }, 'Email already exists');

await UniqueEmail.parseAsync('user@example.com');
await UniqueEmail.safeParseAsync('user@example.com');
```

## Nullability and Defaults

### optional, nullable, nullish

```ts
v.string().optional();
v.string().nullable();
v.string().nullish();
```

### required, default, catch

```ts
v.string().optional().required();
v.string().default('fallback');
v.number().catch(0);

v.object({
  name: v.string().optional(),
}).required();
```

## Refinements

### refine (sync)

```ts
const Password = v
  .string()
  .min(8)
  .refine((value) => /[A-Z]/.test(value), 'Must include uppercase')
  .refine((value) => /\d/.test(value), 'Must include a number');
```

### refineAsync (async)

```ts
const Username = v
  .string()
  .min(3)
  .refineAsync(
    async (value) => {
      const taken = await db.users.exists({ username: value });
      return !taken;
    },
    ({ value }) => `${value} is not available`,
  );
```

## Transform and Preprocess

### transform

```ts
const NormalizedEmail = v
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
```

`transform()` returns `Schema<NewOutput>`, so apply type-specific validators before transforming.

### preprocess

```ts
const NumberFromQuery = v
  .object({
    page: v.number().int().min(1),
  })
  .preprocess((value) => {
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      return { ...obj, page: typeof obj.page === 'string' ? Number(obj.page) : obj.page };
    }

    return value;
  });

const NumberFromString = v.number().preprocess((value) => (typeof value === 'string' ? Number(value) : value));
```

## Object Composition and Unknown Keys

```ts
const Base = v.object({
  id: v.number().int().positive(),
  email: v.string().email(),
  nickname: v.string().optional(),
});

const PublicUser = Base.pick('id', 'nickname');
const InternalUser = Base.extend({ role: v.union('admin', 'editor', 'viewer') });
const RequiredUser = Base.required();
const PartialUser = Base.partial('email');

// Strict by default
Base.safeParse({ id: 1, email: 'a@b.com', extra: true }); // fails

// Allow unknown keys
Base.relaxed().safeParse({ id: 1, email: 'a@b.com', extra: true }); // succeeds
```

## Message Configuration

```ts
configure({
  messages: {
    string_email: () => 'Please enter a valid email address',
    number_min: ({ min }) => `Value must be at least ${min}`,
  },
});
```

## Error Handling

```ts
const result = UserSchema.safeParse(input);

if (!result.success) {
  for (const issue of result.error.issues) {
    console.log(issue.path.join('.'), issue.code, issue.message, issue.params);
  }

  const { fieldErrors, formErrors } = result.error.flatten();
  console.log(fieldErrors, formErrors);
}
```

## Type Inference

```ts
const Schema = v.object({
  id: v.number(),
  email: v.string().email().optional(),
});

type Output = Infer<typeof Schema>;
```

Also available:

```ts
type Output2 = InferOutput<typeof Schema>;
type Output3 = TypeOf<typeof Schema>;
```

## Best Practices

- Reuse schema instances instead of rebuilding per call.
- Use `safeParse()` for user input boundaries.
- Use `parseAsync()` / `safeParseAsync()` whenever async refinements are present.
- Prefer message functions for contextual errors.
- Keep transforms at the end of schema chains.
- Treat `v.object(...)` as strict-by-default and use `.relaxed()` deliberately.
