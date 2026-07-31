---
title: 'Courier Examples — File Uploads'
description: 'Upload multipart forms through Courier.'
---

## File Uploads

### Problem

A browser form must upload a selected file with metadata as `multipart/form-data`.

### Solution

Pass `FormData` directly as the request body so the browser supplies the multipart boundary.

```ts
import { createCourier } from '@vielzeug/courier';

type UploadResult = { url: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const file = new File(['profile'], 'profile.txt', { type: 'text/plain' });
const form = new FormData();
form.append('file', file);
form.append('alt', 'Profile document');

const result = await courier.post<UploadResult>('/upload', { body: form });
console.log(result.url);
```

### Pitfalls

- Do not manually set `Content-Type` for `FormData`; the required boundary would be missing.
- Upload progress is not exposed by fetch; use a platform-specific transport when progress is required.
- Keep files outside query-cache values.

### Related

- [HTTP Requests](../usage.md#http-requests)
- [Error Handling Patterns](./error-handling-patterns.md)
