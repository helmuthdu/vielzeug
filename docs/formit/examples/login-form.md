---
title: 'Formit Examples — Login Form'
description: 'Login Form examples for formit.'
---

## Login Form

### Problem

A login form must validate email format and password presence, display inline errors after the user blurs each field, disable the submit button while a request is in flight, and surface server-side authentication errors.

### Solution

Complete login form with validation and error handling.

```typescript
import { createForm } from '@vielzeug/formit';

const loginForm = createForm({
  defaultValues: {
    email: '',
    password: '',
    rememberMe: false,
  },
  validators: {
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
    ],
    password: [
      (v) => (!v ? 'Password is required' : undefined),
      (v) => (v && String(v).length < 8 ? 'Password must be at least 8 characters' : undefined),
    ],
  },
});

// Handle submission
async function handleLogin() {
  const result = await loginForm.submit(async (values) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  });

  if (!result.ok) {
    console.log('Validation errors:', result.errors);
    return;
  }

  // Success – redirect or update UI
  console.log('Login successful:', result.value);
  window.location.href = '/dashboard';
}
```


### Pitfalls

- Disabling submit based solely on `!state.isValid` prevents submission before the user has attempted anything. Use `!state.isValid && state.submitCount > 0` to only block re-submission after a failed attempt.
- `form.submit()` does not throw on validation failure — it returns `{ ok: false, errors }`. A try/catch around `submit()` only catches exceptions thrown inside your async submit handler.
- `form.setError('password', '...')` adds an error message but does not clear the field value. Call `form.set('password', '')` separately if you want to reset the input.

### Related
- [Schema Validation with Validit](/validit/)
- [Handling HTTP Errors (Fetchit)](/fetchit/examples/error-handling-patterns)

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
