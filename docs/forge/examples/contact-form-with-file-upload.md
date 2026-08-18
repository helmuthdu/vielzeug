---
title: 'Forge Examples — Contact Form with File Upload'
description: Validate a file-bearing form and serialize it as multipart data.
---

## Contact Form with File Upload

### Problem

A contact form needs text validation plus one optional file attachment. The value must remain immutable while `FormData` preserves the binary file during transport.

### Solution

Store a selected `File`, not `FileList`, then serialize the submitted value with `toFormData()`.

```ts
import { createForm } from '@vielzeug/forge';
import { toFormData } from '@vielzeug/forge/form-data';

const form = createForm({
  initialValues: { attachment: null as File | null, email: '', message: '', name: '' },
  validate: (value) => ({
    fields: {
      email: value.email.includes('@') ? undefined : 'Enter a valid email',
      message: value.message.length >= 10 ? undefined : 'Write at least ten characters',
      name: value.name ? undefined : 'Name is required',
    },
  }),
});

function onFileChange(input: HTMLInputElement) {
  form.field('attachment').set(input.files?.[0] ?? null);
}

const result = await form.submit((value) =>
  fetch('/api/contact', { body: toFormData(value), method: 'POST' }).then((response) => response.ok),
);

if (result.status === 'invalid') console.log(result.errors);
```

### Pitfalls

- Do not store `FileList`; select an individual `File` before writing form state.
- Do not set `Content-Type` manually for `FormData`; the browser supplies the multipart boundary.
- Validate file size and type on the server even when client validation exists.

### Related

- [Dynamic Form Fields](./dynamic-form-fields.md)
- [Courier](/courier/)
- [Vault](/vault/)
