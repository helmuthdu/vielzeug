---
title: 'Forge Examples — Login Form'
description: 'Login Form examples for forge.'
---

## Login Form

### Problem

A login form must validate email format and password presence, display inline errors after the user blurs each field, disable the submit button while a request is in flight, and surface server-side authentication errors.

### Solution

Use `createForm()` with per-field `validators` and a `ValidationModes` preset on `connect()` to trigger validation on blur and report errors next to each input.

```ts
import { createForm, ValidationModes } from '@vielzeug/forge';

const form = createForm({
  defaultValues: {
    email: '',
    password: '',
    rememberMe: false,
  },
  connect: ValidationModes.onBlur,
  validators: {
    email: (v) => (!v ? 'Email is required' : !String(v).includes('@') ? 'Invalid email format' : undefined),
    password: (v) => (!v ? 'Password is required' : String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

const emailConn = form.connect('email');
const passwordConn = form.connect('password');

async function handleLogin() {
  const result = await form.submit(async (values) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const { message } = await response.json();
      throw new Error(message);
    }

    return response.json();
  });

  if (!result.ok) {
    // Validation errors are already set on form.state.errors — no manual wiring needed
    return;
  }

  window.location.href = '/dashboard';
}
```

### Pitfalls

- Disabling submit based solely on `!state.isValid` prevents submission before the user has attempted anything. Use `!state.isValid && state.submitCount > 0` to block re-submission only after a failed attempt.
- `form.submit()` does not throw on validation failure — it returns `{ ok: false, errors }`. A `try/catch` around `submit()` only catches exceptions thrown inside your async handler.
- `form.setError('password', '...')` adds an error message but does not clear the field value. Call `form.set('password', '')` separately if you also want to reset the input.

### Related

- [Schema Validation with Sieve](/spell/)
- [Registration Form](./registration-form.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
