# <img src="/logo-utils.svg" alt="Toolkit" width="32" style="display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 10px;"> Toolkit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-100+_utilities-success" alt="Utilities">
</div>

**Toolkit** is a comprehensive, type-safe utility library for modern JavaScript and TypeScript projects. It provides a wide range of helpers for arrays, objects, strings, dates, math, random, and more — all with zero dependencies and full TypeScript support.

## 🚀 Key Features

- **100+ Utilities**: Covering all common data structures and tasks.
- **Type-safe**: Built with TypeScript for excellent developer experience.
- **Tree-shakeable**: Only include the code you actually use.
- **Zero Dependencies**: Lightweight and secure.
- **Isomorphic**: Works perfectly in both the Browser and Node.js.

## 🏁 Quick Start

Install via your favorite package manager:

```sh
pnpm add @vielzeug/toolkit
```

Use any utility in your code:

```ts
import { chunk, group, isString } from '@vielzeug/toolkit';

// Split an array into chunks
const chunks = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Group by a property
const users = [{ id: 1, role: 'admin' }, { id: 2, role: 'user' }];
const grouped = group(users, u => u.role); // { admin: [...], user: [...] }
```

## 📚 Explore the Library

- **[Usage Guide](./usage.md)**: Installation, importing, and best practices.
- **[API Reference](./api.md)**: Complete list of all available functions.
- **[REPL](/repl)**: Try the library right in your browser.

### 🧩 Utilities by Category

- [**Array**](./examples/array.md): Transform, filter, group, and sort.
- [**Object**](./examples/object.md): Deep merge, clone, diff, and nested access.
- [**String**](./examples/string.md): Casing, similarity, and truncation.
- [**Math**](./examples/math.md): Average, median, clamp, and ranges.
- [**Function**](./examples/function.md): Debounce, throttle, compose, and retry.
- [**Typed**](./examples/typed.md): Comprehensive type guards and checks.
- [**Date**](./examples/date.md): Interval and difference calculation.
- [**Random**](./examples/random.md): Random values, shuffle, and UUIDs.

---

> **Tip:** Toolkit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

