---
title: 'Fetchit Examples — File Uploads'
description: 'File Uploads examples for fetchit.'
---

## File Uploads

## Problem

Implement file uploads in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });

// Single file — FormData passes through without JSON serialization
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('alt', 'Profile photo');

const result = await api.post<UploadResult>('/upload', { body: form });

// Multiple files
const batch = new FormData();
for (const file of files) batch.append('files', file);
await api.post('/upload/batch', { body: batch });
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
