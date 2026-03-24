---
title: 'Formit Examples — Best Practices'
description: 'Best Practices examples for formit.'
---

## Best Practices

## Problem

Implement best practices in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

### 0. Schema-Validated Form (Zod / Valibot)

Use `fromSchema()` to connect any `safeParse`-compatible schema:

```ts
import { z } from 'zod';
import { createForm, fromSchema, FormValidationError } from '@vielzeug/formit';

const registrationSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  age: z.number().min(18, 'Must be 18 or older'),
});

const form = createForm({
  defaultValues: { email: '', password: '', age: 0 },
  ...fromSchema(registrationSchema),
  // Per-field validators run on every validateField() call
  validators: {
    email: (v) => (!v ? 'Email is required' : undefined),
  },
});

try {
  await form.submit(async (values) => {
    await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
} catch (err) {
  if (err instanceof FormValidationError) {
    console.log(err.errors); // { email: '...', age: '...' }
  }
}
```

### 1. Always Clean Up Subscriptions

```typescript
// ✅ Good – cleanup in useEffect
useEffect(() => {
  const unsubscribe = form.subscribe(setState);
  return unsubscribe; // Cleanup on unmount
}, [form]);

// ❌ Bad – memory leak
form.subscribe(setState);
```

### 2. Use Field Bindings

```tsx
// ✅ Good – one line
<input {...form.bind('email')} />

// ❌ Verbose – manual wiring
<input
  name="email"
  value={form.get('email')}
  onChange={(e) => form.set('email', e.target.value)}
  onBlur={() => form.touch('email')}
/>
```

### 3. Handle Validation Errors

```typescript
// ✅ Good – proper error handling
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof FormValidationError) {
    for (const [field, message] of Object.entries(error.errors)) {
      console.log(`${field}: ${message}`);
    }
  } else {
    console.error('Submit failed:', error);
  }
}
```

### 4. Show Errors Only When Touched

```tsx
// ✅ Good – only show after user interaction
{
  form.field('email').touched && state.errors['email'] && <span>{state.errors['email']}</span>;
}
// or use bind() which exposes a live `touched` getter:
const binding = form.bind('email');
binding.touched; // read fresh each render

// ❌ Bad – shows immediately on page load
{
  state.errors['email'] && <span>{state.errors['email']}</span>;
}
```

### 5. Use `isValid` / `isDirty` / `isTouched` Flags

```typescript
// ✅ Good – use computed flags
if (state.isValid) {
  /* ... */
}
if (state.isDirty) {
  /* warn before leaving */
}

// ❌ Verbose – manual checks
if (Object.keys(state.errors).length === 0) {
  /* ... */
}
if (state.dirty.size > 0) {
  /* ... */
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

- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
- [Form with Conditional Fields](./form-with-conditional-fields.md)
