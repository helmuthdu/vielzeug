---
title: 'Validit Examples — Forms'
description: 'Form validation examples with validit.'
---

## Form Validation Examples

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

### Parsing Form Payloads

```ts
const payload: unknown = {
  confirmPassword: 'Secret123',
  email: 'ada@example.com',
  name: 'Ada',
  newsletter: 'true',
  password: 'Secret123',
};

const FormInputSchema = RegistrationSchema.extend({
  newsletter: v.coerce.boolean().default(false),
});

const parsed = FormInputSchema.safeParse(payload);
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

### Partial Updates (Patch Forms)

```ts
const ProfilePatchSchema = ProfileSchema.partial();

ProfilePatchSchema.parse({ bio: 'Updated bio' });
```

## Common Pitfalls

- Using `.parse()` directly on user input without error handling.
- Forgetting to call `.safeParseAsync()` when schemas include `.refineAsync()`.
- Applying `.transform()` too early in a chain and losing type-specific methods.

## Related Recipes

- [API](./api.md)
- [Async](./async.md)
- [Unions](./unions.md)
