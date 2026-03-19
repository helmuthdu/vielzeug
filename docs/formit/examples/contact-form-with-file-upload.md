---
title: 'Formit Examples — Contact Form with File Upload'
description: 'Contact Form with File Upload examples for formit.'
---

## Contact Form with File Upload

## Problem

Implement contact form with file upload in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Form with file upload and validation.

```typescript
import { createForm, toFormData } from '@vielzeug/formit';

const contactForm = createForm({
  defaultValues: {
    name: '',
    email: '',
    subject: '',
    message: '',
    attachment: null as File | null,
  },
  validators: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
    subject: (v) => (!v ? 'Subject is required' : undefined),
    message: [
      (v) => (!v ? 'Message is required' : undefined),
      (v) => (v && String(v).length < 10 ? 'Message must be at least 10 characters' : undefined),
    ],
    attachment: (v) => {
      if (!v) return; // Optional field
      const file = v as File;
      if (file.size > 5 * 1024 * 1024) return 'File size must be less than 5MB';
      const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowed.includes(file.type)) return 'Only JPEG, PNG, and PDF files are allowed';
    },
  },
});

// Handle file input
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  contactForm.set('attachment', file || null);
}

// Submit
async function handleSubmit() {
  await contactForm.submit(async (values) => {
    // Use toFormData to include the file attachment
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: form.toFormData(),
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
- [Dynamic Form Fields](./dynamic-form-fields.md)
- [Form with Conditional Fields](./form-with-conditional-fields.md)
