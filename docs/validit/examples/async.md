---
title: 'Validit Examples — Async'
description: 'Async validation examples using refineAsync with validit.'
---

## Async Validation Examples

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

### Combining Sync and Async Rules

```ts
const TeamSlugSchema = v
  .string()
  .min(3)
  .regex(/^[a-z0-9-]+$/)
  .refineAsync(async (value) => {
    const exists = await db.teams.exists({ slug: value });
    return !exists;
  }, 'Slug already in use');

await TeamSlugSchema.parseAsync('platform-team');
```

### Important

Use `parseAsync()` or `safeParseAsync()` when a schema contains async refinements.

## Common Pitfalls

- Calling `.parse()` on schemas with `.refineAsync()`.
- Running external side effects inside `.refineAsync()` that are not idempotent.
- Forgetting to debounce or cache high-volume async checks.

## Related Recipes

- [API](./api.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
