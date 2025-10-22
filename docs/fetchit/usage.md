# Fetchit Usage

How to install, import, and use the fetchit package in your project.

## Installation

```sh
pnpm add @vielzeug/fetchit
```

## Import

```ts
import { createFetchService, buildUrl } from '@vielzeug/fetchit';
```

## Basic Usage

```ts
const api = createFetchService({
  baseURL: 'https://api.example.com',
});
const res = await api.get('/user');
console.log(res.data);
```

## Advanced Usage

- Set custom headers: `api.setHeaders({ Authorization: 'Bearer token' })`
- Use a custom base URL: `const api = createFetchService({ url: 'https://api.example.com' })`
- Build URLs with params: `buildUrl('/api/user', { id: 1 })`
- Cancel or invalidate requests: pass `cancelable: true` or `invalidate: true` in config
- Set request timeout: pass `timeout: 3000` in context

See the [API Reference](./api.md) and [Examples](./examples.md) for more details.
