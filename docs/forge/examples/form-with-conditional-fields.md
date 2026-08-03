---
title: 'Forge Examples — Form with Conditional Fields'
description: Validate conditional values in one full-form rule.
---

## Conditional Values

### Problem

A business account needs a company name, while a personal account does not. Conditional validation must stay with the complete value instead of adding and removing field validators.

### Solution

Make the condition part of the full-form validator and build a transport payload from the current value.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { accountType: 'personal' as 'personal' | 'business', companyName: '', email: '' },
  validate: (value) => ({
    fields: {
      companyName: value.accountType === 'business' && !value.companyName ? 'Company name is required' : undefined,
      email: value.email.includes('@') ? undefined : 'Enter a valid email',
    },
  }),
});

form.field('accountType').set('business');
form.field('companyName').set('Acme');

const payload = form.value.accountType === 'business'
  ? form.value
  : { accountType: form.value.accountType, email: form.value.email };

console.log(payload);
```

### Pitfalls

- Hidden values remain in `form.value` until application code omits them from its payload.
- Keep conditional errors in the validator; do not mutate form error state from subscriptions.
- Revalidate after changing the condition when UI must immediately refresh errors.

### Related

- [Login Form](./login-form.md)
- [Registration Form](./registration-form.md)
- [Spell](/spell/)
