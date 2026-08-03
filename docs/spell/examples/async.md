---
title: 'Spell Examples — Async Business Rules'
description: 'Attach asynchronous business rules to spell schemas using checkAsync() and parse them safely.'
---

## Async Business Rules

### Problem

A value can be structurally valid but still fail business rules such as uniqueness checks or reserved names. Those rules usually need async I/O.

### Solution

Use `checkAsync()` for async callbacks. Spell awaits them through `parseAsync()` or `safeParseAsync()`.

```ts
import { s } from '@vielzeug/spell';

const takenEmails = new Set(['ada@example.com']);
const bannedDomains = new Set(['example.org']);

async function isEmailAvailable(value: string) {
  return !takenEmails.has(value);
}

const Account = s.object({
  email: s
    .string()
    .email()
    .checkAsync(async (value, ctx) => {
      const domain = value.split('@')[1] ?? '';

      if (bannedDomains.has(domain)) {
        ctx.addIssue({ code: 'custom', message: 'Email domain is blocked', path: [] });
      }

      if (!(await isEmailAvailable(value))) {
        ctx.addIssue({ code: 'custom', message: 'Email is already in use', path: [] });
      }
    }),
  password: s.string().min(12),
});

const result = await Account.safeParseAsync({
  email: 'grace@example.com',
  password: 'horse-battery-staple',
});

console.log(result.success);
```

#### Simple string shorthand

When only one error message is needed, return the message directly:

```ts
import { s } from '@vielzeug/spell';

const takenSlugs = new Set(['about', 'contact']);

const Slug = s
  .string()
  .slug()
  .checkAsync(async (v) => (!takenSlugs.has(v) ? null : `'${v}' is already taken`));

await Slug.parseAsync('about'); // throws: 'about' is already taken
await Slug.parseAsync('changelog'); // 'changelog'
```

### Pitfalls

- `checkAsync()` makes a schema async-only: TypeScript removes `parse()` and `safeParse()`, while runtime guards still reject sync parsing. Use `parseAsync()` when any rule performs I/O.
- Keep I/O inside `checkAsync()`, not inside `transform()`. Validation failures must go through the issue model.
- Call `ctx.addIssue()` more than once to emit multiple issues from a single async rule.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Validating API Payloads](./api.md)
