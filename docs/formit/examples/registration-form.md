---
title: 'Formit Examples — Registration Form'
description: 'Registration Form examples for formit.'
---

## Registration Form

## Problem

Implement registration form in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Registration form with async validation and password confirmation.

```typescript
import { createForm } from '@vielzeug/formit';

const registrationForm = createForm({
  defaultValues: {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
  validators: {
    username: [
      (v) => (!v ? 'Username is required' : undefined),
      (v) => (v && String(v).length < 3 ? 'Username must be at least 3 characters' : undefined),
      async (v) => {
        if (!v) return;
        const response = await fetch(`/api/check-username?username=${v}`);
        const { exists } = await response.json();
        if (exists) return 'Username is already taken';
      },
    ],
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
    ],
    password: [
      (v) => (!v ? 'Password is required' : undefined),
      (v) => (v && String(v).length < 8 ? 'Min 8 characters' : undefined),
      (v) => (v && !/[A-Z]/.test(String(v)) ? 'Must contain uppercase letter' : undefined),
      (v) => (v && !/[0-9]/.test(String(v)) ? 'Must contain a number' : undefined),
    ],
  },
  validator: (values) => {
    const errors: Record<string, string> = {};
    if (values['password'] !== values['confirmPassword']) {
      errors['confirmPassword'] = 'Passwords must match';
    }
    return errors;
  },
});

// Submit
async function handleRegistration() {
  await registrationForm.submit(async (values) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
