---
title: 'Spell Examples — Form-Safe Parsing'
description: 'Use spell schemas to turn browser-like form values into typed application input.'
---

## Form-Safe Parsing

### Problem

Form submissions often arrive as strings, optional fields, and checkboxes. You need typed output without repeating conversion code for every field.

### Solution

Use coercion, wrappers, and formatted errors to normalize the form payload in one step.

```ts
import { SpellValidationError, s } from '@vielzeug/spell';

const SignupForm = s.object({
  age: s.coerce.number().int().min(18),
  email: s.string().email(),
  marketing: s.coerce.boolean().default(false),
  referralCode: s.string().trim().optional().nullable().required(),
});

const result = SignupForm.safeParse({
  age: '29',
  email: 'ada@example.com',
  marketing: 'true',
  referralCode: null,
});

if (result.success) {
  console.log(result.data.referralCode);
} else if (SpellValidationError.is(result.error)) {
  console.log(result.error.format());
}
```

### Pitfalls

- `.required()` removes `undefined` but keeps `null`. That matters after `.optional().nullable()` chains.
- `s.coerce.boolean()` is for loosely typed input at the boundary. Keep your app state typed after parsing.
- Call `safeParseAsync()` if any nested field uses `checkAsync()`.

### Related

- [Usage Guide](../usage.md)
- [Async Business Rules](./async.md)
- [Forge](/forge/)
