---
title: 'Forge Examples — Registration Form'
description: 'Registration Form examples for forge.'
---

## Registration Form

### Problem

A registration form needs a confirmed password field (both values must match) and an async email-uniqueness check that queries the server while the user is still typing.

### Solution

Registration form with async validation and password confirmation.

```typescript
import { createForm } from '@vielzeug/forge';

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
  const result = await registrationForm.submit(async (values) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });

  if (!result.ok) {
    console.log(result.errors);
    return;
  }
}
```


### Pitfalls

- Async validators run on every `validateField()` call, including on every blur. Debounce them to avoid an API request on each keystroke.
- The password-confirmation validator must re-run when the original password field changes, not only when confirmation changes. Read `form.values.password` inside the confirmation validator.
- `form.state.isSubmitting` stays `true` until the submit handler resolves or rejects. Unhandled rejections inside the handler leave the form stuck in the submitting state.

### Related
- [Schema Validation with Sieve](/sieve/)

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
