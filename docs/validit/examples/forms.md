---
title: 'Validit Examples — Forms'
description: 'Form validation examples with validit.'
---

## Form Validation Examples

## Problem

Implement form validation examples in a production-friendly way with `@vielzeug/validit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/validit` installed.

### Registration Schema

```ts
import { v, type Infer } from '@vielzeug/validit';

export const RegistrationSchema = v
  .object({
    name: v.string().min(1, 'Name is required'),
    email: v.string().trim().email('Invalid email address'),
    password: v
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((value) => /[A-Z]/.test(value), 'Add at least one uppercase letter')
      .refine((value) => /\d/.test(value), 'Add at least one number'),
    confirmPassword: v.string(),
    newsletter: v.boolean().default(false),
  })
  .refine((value) => value.password === value.confirmPassword, 'Passwords must match');

export type Registration = Infer<typeof RegistrationSchema>;
```

### Mapping Errors For UI

```ts
const result = RegistrationSchema.safeParse(formData);

if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
  // fieldErrors => { email: ['Invalid email'], password: ['...'] }
  // formErrors => ['Passwords must match']
}
```

### Optional Profile Fields

```ts
const ProfileSchema = v.object({
  displayName: v.string().min(1),
  bio: v.string().max(280).optional(),
  birthday: v.date().optional(),
  website: v.string().url().optional(),
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [API](./api.md)
- [Async](./async.md)
- [Unions](./unions.md)
