---
title: 'Spell Examples — Async Validation'
description: 'Async validation example for @vielzeug/spell.'
---

## Async Validation

### Problem

Validate values that depend on asynchronous checks such as uniqueness, account state, or external policy rules.

### Solution

Use `.checkAsync()` on any schema combined with `safeParseAsync()` or `parseAsync()` to run async validators such as database lookups or external policy checks.

```ts
import { s } from '@vielzeug/spell';

const UsernameSchema = s
  .string()
  .min(3)
  .checkAsync(async (value) => {
    const exists = await db.users.exists({ username: value });
    return !exists || 'Username already taken';
  });

const result = await UsernameSchema.safeParseAsync(input.username);

const CompanyEmailSchema = s
  .string()
  .email()
  .checkAsync(async (value) => {
    const domain = value.split('@')[1] ?? '';
    return allowedDomains.has(domain.toLowerCase()) || `${value} is not an allowed company email`;
  });

const InviteSchema = s
  .object({
    workspaceId: s.string().uuid(),
    email: s.string().email(),
  })
  .checkAsync(async ({ workspaceId, email }) => {
    return !(await db.invites.exists({ workspaceId, email })) || 'Invite already exists for this user and workspace';
  });

await InviteSchema.parseAsync(payload);

const TeamSlugSchema = s
  .string()
  .min(3)
  .regex(/^[a-z0-9-]+$/)
  .checkAsync(async (value) => {
    const exists = await db.teams.exists({ slug: value });
    return !exists || 'Slug already in use';
  });

await TeamSlugSchema.parseAsync('platform-team');
```

### Pitfalls

- Calling `.parse()` or `.safeParse()` on schemas with `checkAsync()` functions.
- Running side effects inside async `check()` functions that are not safe to retry.
- Forgetting to debounce or batch high-volume availability checks in UI code.

### Related

- [API](./api.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
