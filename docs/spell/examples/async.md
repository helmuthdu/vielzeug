---
title: 'Spell Examples — Async Business Rules'
description: 'Attach asynchronous business checks to spell schemas and parse them safely.'
---

## Async Business Rules

### Problem

A value can be structurally valid but still fail business rules such as uniqueness or reserved names. Those checks usually need async I/O.

### Solution

Keep structural checks in the schema and move async business rules into `checkAsync()`.

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
        ctx.addIssue('custom', 'Email domain is blocked');
      }

      if (!(await isEmailAvailable(value))) {
        ctx.addIssue('custom', 'Email is already in use');
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

### Pitfalls

- Async checks require `parseAsync()` or `safeParseAsync()`. The synchronous APIs cannot await nested rules.
- Keep I/O inside `checkAsync()`, not inside `transform()`. Validation failures should stay in the issue model.
- If you need multiple issues, call `ctx.addIssue()` more than once instead of throwing early.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Validating API Payloads](./api.md)
