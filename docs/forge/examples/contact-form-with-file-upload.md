---
title: 'Forge Examples — Contact Form with File Upload'
description: 'Contact Form with File Upload examples for forge.'
---

## Contact Form with File Upload

### Problem

A contact form collects text fields and a file attachment. The file must be validated client-side (size, type) before being submitted alongside the other fields as `multipart/form-data`.

### Solution

Use `createForm()` with a `File` field validator combined with `toFormData()` to serialize the final values for a `multipart/form-data` request.

```typescript
import { createForm, toFormData } from '@vielzeug/forge';
import { composeValidators } from '@vielzeug/forge/validators';

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
    email: composeValidators(
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ),
    subject: (v) => (!v ? 'Subject is required' : undefined),
    message: composeValidators(
      (v) => (!v ? 'Message is required' : undefined),
      (v) => (v && String(v).length < 10 ? 'Message must be at least 10 characters' : undefined),
    ),
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
  const result = await contactForm.submit(async (values) => {
    // Use toFormData to include the file attachment
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: toFormData(contactForm.values()),
    });
    return response.json();
  });

  if (!result.ok) {
    console.log(result.errors);
  }
}
```

### Pitfalls

- Do not set `Content-Type` manually when building a `FormData` request. The browser must include the multipart boundary — overriding the header removes it and breaks server parsing.
- `file.type` is derived from the file extension and can be spoofed. Client-side MIME validation is a UX aid only — always validate the file on the server.
- `form.state.isSubmitting` is `false` before `submit()` is called. Checking it during the pre-submit validation phase always returns `false`.
- `FormOptions.validators` accepts one `FieldValidator` function per field, not an array — chain multiple checks with `composeValidators()` from `@vielzeug/forge/validators`.

### Related

- [File Uploads (Courier)](/courier/examples/file-uploads)
- [Schema Validation with Spell](/spell/)
- [Dynamic Form Fields](./dynamic-form-fields.md)
- [Form with Conditional Fields](./form-with-conditional-fields.md)
