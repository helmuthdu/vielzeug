---
title: 'Formit Examples — Login Form'
description: 'Login Form examples for formit.'
---

## Login Form

## Problem

Implement login form in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Complete login form with validation and error handling.

```typescript
import { createForm, FormValidationError } from '@vielzeug/formit';

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
  try {
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

    // Success – redirect or update UI
    console.log('Login successful:', result);
    window.location.href = '/dashboard';
  } catch (error) {
    if (error instanceof FormValidationError) {
      // Validation failed — errors are already set on the form
      console.log('Validation errors:', error.errors); // Record<string, string>
    } else {
      // Server error
      console.error('Login failed:', error);
      loginForm.setError('email', 'Invalid credentials');
    }
  }
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
