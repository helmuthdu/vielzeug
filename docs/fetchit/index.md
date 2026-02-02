# <img src="/logo-http.svg" alt="Fetchit" width="32" style="display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 10px;"> Fetchit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-9.8_KB-success" alt="Size">
</div>

**Fetchit** is a modern, type-safe HTTP client for browser and Node.js. It provides a powerful, unified API for making requests with built-in support for caching, cancellation, timeouts, and more.

## 🚀 Key Features

- **Unified API**: Consistent interface for GET, POST, PUT, PATCH, and DELETE.
- **Type-safe**: Robust request and response typing with full TypeScript support.
- **Smart Caching**: Built-in caching mechanism to reduce redundant network calls.
- **Deduplication**: Automatically prevent concurrent identical requests.
- **Auto Parsing**: Intelligent handling of JSON, text, and binary data.
- **Modern Defaults**: Sensible timeouts, headers, and error handling out of the box.

## 🏁 Quick Start

```sh
pnpm add @vielzeug/fetchit
```

### Basic Usage

```ts
import { createFetchService } from '@vielzeug/fetchit';

// 1. Create a service instance
const api = createFetchService({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// 2. Make type-safe requests
interface User {
  id: string;
  name: string;
}

const res = await api.get<User>('/users/1');
console.log(res.data.name);
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Service configuration, interceptors, and error handling.
- **[API Reference](./api.md)**: Complete documentation of all methods and options.
- **[Examples](./examples.md)**: Patterns for caching, cancellation, and file uploads.

## 💡 Why Fetchit?

While `fetch` is a great native API, it requires significant boilerplate for common tasks like base URLs, timeouts, and JSON parsing. Fetchit wraps these patterns into a clean, type-safe package that works identically in the browser and Node.js.

---

> **Tip:** Fetchit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

