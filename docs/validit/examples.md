---
title: Validit — Examples
description: Real-world validation recipes and patterns for Validit.
---

# Validit Examples

[[toc]]

## How to Use These Examples

These examples cover form validation, API parsing, async rules, and union/variant schemas.

1. Start with the first example page to learn the baseline pattern.
2. Move to advanced pages that match your framework or production scenario.
3. Keep the API page open while adapting snippets to your project.

These examples are aligned with the current `@vielzeug/validit` API.

## Examples Overview

- [Form Validation](./examples/forms.md)
- [API Validation](./examples/api.md)
- [Async Validation](./examples/async.md)
- [Union and Variant Patterns](./examples/unions.md)

## Quick Recipe: Registration Form

```ts
import { v } from '@vielzeug/validit';

const RegistrationSchema = v
  .object({
    email: v.string().trim().email(),
    password: v
      .string()
      .min(8)
      .refine((value) => /[A-Z]/.test(value), 'Must contain an uppercase letter')
      .refine((value) => /\d/.test(value), 'Must contain a number'),
    confirmPassword: v.string(),
  })
  .refine((value) => value.password === value.confirmPassword, 'Passwords must match');
```

## Quick Recipe: Query Params

```ts
const QuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  limit: v.coerce.number().int().min(1).max(100).default(20),
  q: v.string().min(1),
});

const parsed = QuerySchema.parse(req.query);
```

## Quick Recipe: Async Uniqueness Check

```ts
const UsernameSchema = v
  .string()
  .min(3)
  .refineAsync(async (value) => {
    const exists = await db.users.exists({ username: value });
    return !exists;
  }, 'Username is already taken');

const result = await UsernameSchema.safeParseAsync(input.username);
```
