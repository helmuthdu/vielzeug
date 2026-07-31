---
title: 'Courier Examples — Authentication'
description: 'Add a current bearer token to every Courier request.'
---

## Authentication

### Problem

HTTP calls and streams need the current access token without copying authorization code into every request.

### Solution

Install one dynamic bearer interceptor. The provider is evaluated for every request, so a refreshed token is
used automatically.

```ts
import { createCourier, withBearerAuth } from '@vielzeug/courier';

let accessToken = '';
const courier = createCourier({ baseUrl: 'https://api.example.com' });
const removeAuth = courier.use(withBearerAuth(() => accessToken));

async function signIn(token: string): Promise<void> {
  accessToken = token;
  await courier.get('/profile');
}

function signOut(): void {
  accessToken = '';
  courier.cancelAll();
  courier.queries.clear();
  removeAuth();
}
```

### Pitfalls

- Keep access tokens out of URLs because logging interceptors include complete URLs.
- Use a request-scoped client in SSR so headers never cross users.
- Remove an interceptor only when its owning scope ends.

### Related

- [Interceptors](../usage.md#interceptors)
- [Error Handling Patterns](./error-handling-patterns.md)
