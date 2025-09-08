# Fetchit Examples

Here are some practical examples of using the http package.

## Basic GET Request

```ts
import { Http } from '@vielzeug/fetchit';

const api = createFetchService({
  baseURL: 'https://api.example.com',
});
const res = await api.get('/user');
console.log(res.data);
```

## POST, PUT, PATCH, DELETE

```ts
const api = createFetchService({
  baseURL: 'https://api.example.com',
});
await api.post('/user', { body: { name: 'Alice' } });
await api.put('/user/1', { body: { name: 'Bob' } });
await api.patch('/user/1', { body: { age: 31 } });
await api.delete('/user/1');
```

## Custom Headers and Base URL

```ts
import { createFetchService } from '@vielzeug/fetchit';

const api = createFetchService({ url: 'https://api.example.com', headers: { Authorization: 'Bearer token' } });
const res = await api.get('/user');
```

## Building URLs with Params

```ts
import { buildUrl } from '@vielzeug/fetchit';

const url = buildUrl('/api/user', { id: 1, active: true });
// /api/user?id=1&active=true
```

## Request Cancellation and Timeout

```ts
const res = await api.get('/api/slow', { cancelable: true });
// Or set a timeout in context:
const api = createFetchService({ timeout: 2000 });
await api.get('/slow');
```

## Error Handling

```ts
try {
  await api.get('/api/404');
} catch (err) {
  console.error('Request failed:', err);
}
```
