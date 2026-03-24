---
title: 'Validit Examples — Async'
description: 'Async validation examples using refineAsync with validit.'
---

## Async Validation Examples

## Problem

Implement async validation examples in a production-friendly way with `@vielzeug/validit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/validit` installed.

### Username Availability

```ts
import { v } from '@vielzeug/validit';

const UsernameSchema = v
  .string()
  .min(3)
  .refineAsync(async (value) => {
    const exists = await db.users.exists({ username: value });
    return !exists;
  }, 'Username already taken');

const result = await UsernameSchema.safeParseAsync(input.username);
```

### Domain Validation

```ts
const CompanyEmailSchema = v
  .string()
  .email()
  .refineAsync(
    async (value) => {
      const domain = value.split('@')[1] ?? '';
      return allowedDomains.has(domain.toLowerCase());
    },
    ({ value }) => `${value} is not an allowed company email`,
  );
```

### Async Object Refinement

```ts
const InviteSchema = v
  .object({
    workspaceId: v.string().uuid(),
    email: v.string().email(),
  })
  .refineAsync(async ({ workspaceId, email }) => {
    return !(await db.invites.exists({ workspaceId, email }));
  }, 'Invite already exists for this user and workspace');

await InviteSchema.parseAsync(payload);
```

### Important

Use `parseAsync()` or `safeParseAsync()` when a schema contains async refinements.

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [API](./api.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
