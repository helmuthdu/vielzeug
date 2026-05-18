---
title: 'Validit Examples — Forms'
description: 'Form validation examples with validit.'
---

## Form validation examples

### Problem

Validate a registration form, normalize browser values, and expose errors in a shape that maps directly into field-level UI.

### Runnable Example

```ts
import { v, type Infer } from '@vielzeug/validit';

const RegistrationSchema = v
  .object({
    name: v.string().min(1, 'Name is required'),
    email: v.string().trim().email('Invalid email address'),
    password: v
      .string()
      .min(8, 'Password must be at least 8 characters')
      .check((value) => /[A-Z]/.test(value) || 'Add at least one uppercase letter')
      .check((value) => /\d/.test(value) || 'Add at least one number'),
    confirmPassword: v.string(),
    newsletter: v.boolean().default(false),
  })
  .check((value) => value.password === value.confirmPassword || 'Passwords must match');

export type Registration = Infer<typeof RegistrationSchema>;

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

if (parsed.success) {
  console.log(parsed.data);
} else {
  const { fieldErrors, formErrors } = parsed.error.flattenFirst();

  console.log(fieldErrors);
  console.log(formErrors);
}
```

### Expected Output

```ts
{
  confirmPassword: 'Secret123',
  email: 'ada@example.com',
  name: 'Ada',
  newsletter: true,
  password: 'Secret123'
}
```

If the passwords do not match, `formErrors` contains `['Passwords must match']` because the object-level check has no field path.

### Common Pitfalls

- Validating raw form payloads with `v.boolean()` instead of `v.coerce.boolean()`.
- Expecting cross-field object refinements to appear under a field key instead of `formErrors`.
- Using `flatten()` when the UI only needs the first message per field.

### Related

- [API](./api.md)
- [Async](./async.md)
- [Unions](./unions.md)

## Optional profile fields

```ts
const ProfileSchema = v.object({
  displayName: v.string().min(1),
  bio: v.string().max(280).optional(),
  birthday: v.date().optional(),
  website: v.string().url().optional(),
});
```

## Partial updates

```ts
const ProfilePatchSchema = ProfileSchema.partial();

ProfilePatchSchema.parse({ bio: 'Updated bio' });
```
