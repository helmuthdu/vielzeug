---
title: 'Sieve Examples — Async'
description: 'Async validation examples using check() with sieve.'
---

## Async validation examples

### Problem

Validate values that depend on asynchronous checks such as uniqueness, account state, or external policy rules.

### Runnable Example

```ts
import { s } from '@vielzeug/sieve';

const UsernameSchema = s
  .string()
  .min(3)
  .check(async (value) => {
    const exists = await db.users.exists({ username: value });
    return !exists;
  }, 'Username already taken');

const result = await UsernameSchema.safeParseAsync(input.username);

const CompanyEmailSchema = s
  .string()
  .email()
  .check(
    async (value) => {
      const domain = value.split('@')[1] ?? '';
      return allowedDomains.has(domain.toLowerCase());
    },
    ({ value }) => `${value} is not an allowed company email`,
  );

const InviteSchema = s
  .object({
    workspaceId: s.string().uuid(),
    email: s.string().email(),
  })
  .check(async ({ workspaceId, email }) => {
    return !(await db.invites.exists({ workspaceId, email }));
  }, 'Invite already exists for this user and workspace');

await InviteSchema.parseAsync(payload);

const TeamSlugSchema = s
  .string()
  .min(3)
  .regex(/^[a-z0-9-]+$/)
  .check(async (value) => {
    const exists = await db.teams.exists({ slug: value });
    return !exists;
  }, 'Slug already in use');

await TeamSlugSchema.parseAsync('platform-team');
```

### Expected Output

- `safeParseAsync()` returns the same success or failure shape as `safeParse()`, but after awaiting async refinements.
- Sync validators still run first, so obviously invalid input can fail before the expensive async check.

### Common Pitfalls

- Calling `.parse()` or `.safeParse()` on schemas with async `check()` functions.
- Running side effects inside async `check()` functions that are not safe to retry.
- Forgetting to debounce or batch high-volume availability checks in UI code.

### Related

- [API](./api.md)
- [Forms](./forms.md)
- [Unions](./unions.md)

Use `parseAsync()` or `safeParseAsync()` whenever the schema contains async `check()` functions anywhere in the tree.
