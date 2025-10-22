# <img src='/logo-http.svg' alt='Toolkit Logo' width='156' style='float: left; padding: 1rem; margin: 1rem;'/> Fetchit

**Fetchit** is a modern, type-safe HTTP client for browser and Node.js apps. It provides a simple API for making requests, caching, cancellation, timeouts, and more—all with full TypeScript support.

## 🚀 Features

- Unified API for GET, POST, PUT, PATCH, DELETE
- Type-safe request and response handling
- Built-in caching and request deduplication
- Request cancellation and timeouts
- Automatic JSON, text, and blob parsing
- Custom headers and base URL support
- Works in browser and Node.js
- Zero dependencies (except for optional logger)

## 🏁 Getting Started

```ts
import { createFetchService } from '@vielzeug/fetchit';

const api = createFetchService({
  baseURL: 'https://api.example.com',
});
const res = await api.get('/api/user');
console.log(res.data);
```

## 📚 Documentation

- [API Reference](./api.md): Full API details for all methods and types.
- [Usage](./usage.md): How to install, set up, and use Http in your project.
- [Examples](./examples.md): Practical code samples for all major features.

## 💡 Why Fetchit?

- No more boilerplate for fetch or axios
- Consistent, type-safe requests and responses
- Built for modern web and Node.js apps

---

> **Tip:** Fetchit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) toolkit for modern web development.
