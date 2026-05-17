---
title: 'Fetchit Examples — File Uploads'
description: 'File Uploads examples for fetchit.'
---

## File Uploads

### Problem

You need to send one or more files to the server as `multipart/form-data` and report upload progress to the user in real time.

### Solution

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


### Pitfalls

- Do not set `Content-Type` manually on a `FormData` request. The browser must include the multipart boundary in the header — setting it manually removes the boundary and breaks server parsing.
- `e.dataTransfer.files` / `input.files` is a `FileList`, not an array. Always convert with `Array.from()` before iterating.
- Upload progress events only fire if the server supports chunked reading. Proxies that buffer the full request body report 100% progress immediately, regardless of actual transfer speed.

### Related

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
