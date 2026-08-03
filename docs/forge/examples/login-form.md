---
title: 'Forge Examples — Login Form'
description: Validate credentials and submit only a valid immutable login value.
---

## Login Form

### Problem

A login screen needs field errors after validation and must avoid calling its API for invalid credentials. It also needs a predictable result for validation failure and submission failure.

### Solution

Create one validator for the complete login value and inspect the discriminated submit result.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (value) => ({
    fields: {
      email: value.email.includes('@') ? undefined : 'Enter a valid email',
      password: value.password.length >= 8 ? undefined : 'Use at least eight characters',
    },
  }),
});

form.field('email').set('ada@example.com');
form.field('password').set('correct-horse-battery-staple');

const result = await form.submit(async (value) => {
  const response = await fetch('/api/login', {
    body: JSON.stringify(value),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return response.ok;
});

if (!result.ok && result.type === 'validation') console.log(result.errors);
```

### Pitfalls

- Call `touch()` from the input blur handler when errors should follow user interaction.
- Handle `result.type === 'aborted'` when external validation can be cancelled.
- Let handler failures reject; Forge only converts validation failure into a result.

### Related

- [Registration Form](./registration-form.md)
- [Spell](/spell/)
- [Courier](/courier/)
