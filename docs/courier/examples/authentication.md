---
title: 'Courier Examples — Authentication'
description: 'Add a current bearer token to every Courier request.'
---

## Authentication

### Problem

HTTP calls need the current access token without copying authorization code into every request.

### Solution

Install one dynamic bearer middleware at construction. The provider is evaluated for every request, so a refreshed token is used automatically.

```ts
import { createCourier, withBearerAuth } from '@vielzeug/courier';

let accessToken = '';
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withBearerAuth(() => accessToken)],
});

async function signIn(token: string): Promise<void> {
  accessToken = token;
  await courier.get('/profile');
}

function signOut(): void {
  accessToken = '';
  courier.cancelAll();
  courier.clearCache();
}
```

### Pitfalls

- Returning `null`, `undefined`, or an empty string from the provider omits the authorization header.
- Keep access tokens out of URLs because logging middleware includes complete URLs.
- Use a request-scoped client in SSR so headers and cached values never cross users.
- Include a stable non-secret principal or tenant atom in authenticated cache keys, and clear the cache when identity changes.
- Middleware is immutable; create a new client to change policy.

### Related

- [Middleware](../usage.md#middleware)
- [Error Handling Patterns](./error-handling-patterns.md)
