<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-100+_utilities-success" alt="Utilities">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

<img src="/logo-toolkit.svg" alt="Toolkit Logo" width="156" class="logo-highlight"/>

# Toolkit

**Toolkit** is a comprehensive, type-safe utility library for modern JavaScript and TypeScript projects. It provides a wide range of helpers for arrays, objects, strings, dates, math, random, and more — all with zero dependencies and full TypeScript support.

## What Problem Does Toolkit Solve?

Modern JavaScript projects often require common data manipulation tasks—grouping arrays, deep merging objects, debouncing functions, or checking types safely. While native JavaScript provides some of these capabilities, they're often verbose, error-prone, or missing entirely.

**Toolkit solves this by providing:**

- **Consistent API**: All utilities follow predictable patterns with unified error handling
- **Type Safety**: Catch errors at compile-time with full TypeScript inference, not at runtime
- **Zero Dependencies**: No supply chain risks, bloat, or version conflicts
- **Battle-tested**: Production-ready utilities with >95% test coverage
- **Performance**: Optimized implementations with minimal overhead

### Comparison with Alternatives

| Feature                | Toolkit              | Lodash            | Ramda             | Native JS  |
| ---------------------- | -------------------- | ----------------- | ----------------- | ---------- |
| TypeScript Support     | ✅ First-class       | ⚠️ Via @types     | ⚠️ Via @types     | ❌ Limited |
| Tree-shakeable         | ✅ By default        | ⚠️ lodash-es only | ✅ Yes            | N/A        |
| Bundle Size (min+gzip) | ~2-3KB per utility   | ~24KB (full)      | ~12KB (full)      | 0KB        |
| Dependencies           | 0                    | 0                 | 0                 | N/A        |
| Learning Curve         | Low                  | Low               | High (FP focused) | Low        |
| Async Support          | ✅ Built-in          | ❌ Limited        | ❌ Limited        | ⚠️ Manual  |
| Isomorphic             | ✅ Browser + Node.js | ✅ Yes            | ✅ Yes            | ✅ Yes     |

## When to Use Toolkit

**✅ Use Toolkit when you:**

- Build TypeScript applications requiring full type safety and inference
- Need modern, tree-shakeable utilities to minimize bundle sizes
- Want zero dependencies for better security and maintainability
- Require isomorphic code that runs in both Browser and Node.js
- Need comprehensive utility coverage without learning functional programming paradigms
- Work with async operations and need built-in Promise support

**❌ Consider alternatives when you:**

- Already heavily invested in the Lodash ecosystem with legacy code
- Need pure functional programming with composition (consider Ramda)
- Build micro-libraries where even small dependencies matter
- Native alternatives are sufficient and you don't need type safety

## 🚀 Key Features

- **100+ Utilities**: Covering all common data structures and tasks.
- **Type-safe**: Built with TypeScript for excellent developer experience.
- **Tree-shakeable**: Only include the code you actually use.
- **Zero Dependencies**: Lightweight and secure.
- **Isomorphic**: Works perfectly in both the Browser and Node.js.

## 🏁 Quick Start

### Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/toolkit
```

```sh [npm]
npm install @vielzeug/toolkit
```

```sh [yarn]
yarn add @vielzeug/toolkit
```

:::

### Basic Usage

Import only what you need (tree-shaking friendly):

```ts
import { chunk, group, isString } from '@vielzeug/toolkit';

// Split an array into chunks
const chunks = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Group by a property
const users = [
  { id: 1, role: 'admin' },
  { id: 2, role: 'user' },
];
const grouped = group(users, (u) => u.role); // { admin: [...], user: [...] }
```

Or import from specific modules:

```ts
import { chunk } from '@vielzeug/toolkit/array';
import { group } from '@vielzeug/toolkit/object';
import { debounce } from '@vielzeug/toolkit/function';
```

### Real-World Example

**Problem**: You're building an e-commerce API that needs to paginate products, group them by category, and handle search with debouncing.

**Without Toolkit** (verbose, error-prone):

```ts
// Pagination - manual implementation
function paginateProducts(products: Product[], page: number, size: number) {
  const start = (page - 1) * size;
  const end = start + size;
  return products.slice(start, end);
}

// Grouping - verbose reduce logic
function groupByCategory(products: Product[]) {
  return products.reduce(
    (acc, product) => {
      const category = product.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );
}

// Debounce - complex timing logic
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

**With Toolkit** (clean, type-safe, one-liner):

```ts
import { chunk, group, debounce, retry, pool } from '@vielzeug/toolkit';

// Pagination - elegant and clear
const page1 = chunk(products, 20)[0]; // First page of 20 items

// Grouping - type-safe with full inference
const byCategory = group(products, (p) => p.category);
// Type: Record<string, Product[]> - automatically inferred!

// Debounce - maintains original function signature
const searchProducts = debounce((query: string) => {
  console.log(`Searching for: ${query}`);
}, 300);

// Async utilities - retry API calls with exponential backoff
const data = await retry(() => fetch('/api/data').then((r) => r.json()), { times: 3, delay: 1000, backoff: 2 });

// Rate limiting with promise pool
const apiPool = pool(5); // Max 5 concurrent requests
const results = await Promise.all(urls.map((url) => apiPool(() => fetch(url))));
```

### TypeScript Integration

Toolkit provides excellent TypeScript support with **full type inference**:

```ts
import { pick, isString, map } from '@vielzeug/toolkit';

const user = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
};

// ✅ Type is automatically inferred as { name: string; email: string }
const publicUser = pick(user, ['name', 'email']);

// ✅ Type guard narrows unknown to string
function processInput(input: unknown) {
  if (isString(input)) {
    // TypeScript knows input is string here
    return input.toUpperCase();
  }
  return 'Invalid input';
}

// ✅ Async operations with proper type inference
const ids = [1, 2, 3];
const users = await map(ids, async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json(); // Type inferred from context
});
```

## 🎓 Core Concepts

### Tree-Shakable

Import only what you need for minimal bundle size:

```ts
import { map, filter } from '@vielzeug/toolkit';
// Only ~500 bytes added to your bundle
```

### Type-Safe

Full TypeScript support with automatic type inference:

```ts
const numbers = [1, 2, 3];
const doubled = map(numbers, (n) => n * 2);
// Type: number[]
```

### Async-First

Functions work with both sync and async operations:

```ts
// Sync
const result = map([1, 2, 3], (n) => n * 2);

// Async
const users = await map(ids, async (id) => fetchUser(id));
```

### Composable

Chain and combine utilities for powerful data transformations:

```ts
import { pipe, filter, map, sort } from '@vielzeug/toolkit';

const processUsers = pipe(
  (users) => filter(users, (u) => u.active),
  (users) => map(users, (u) => ({ ...u, name: u.name.toUpperCase() })),
  (users) => sort(users, (a, b) => a.name.localeCompare(b.name)),
);
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, importing, and best practices
- **[API Reference](./api.md)**: Complete list of all available functions
- **[REPL](/repl)**: Try the library right in your browser

### 🧩 Utilities by Category

- [**Array**](./examples/array.md): Transform, filter, group, and sort arrays with type safety.
- [**Async**](./examples/async.md): Promise utilities, concurrency control, retries, and timeouts.
- [**Object**](./examples/object.md): Deep merge, clone, diff, and nested access.
- [**String**](./examples/string.md): Casing, similarity, truncation, and formatting.
- [**Math**](./examples/math.md): Average, median, clamp, ranges, and statistics.
- [**Function**](./examples/function.md): Debounce, throttle, compose, and memoize.
- [**Typed**](./examples/typed.md): Comprehensive type guards and runtime checks.
- [**Date**](./examples/date.md): Interval calculation and time differences.
- [**Random**](./examples/random.md): Random values, shuffle, sampling, and UUIDs.

## 📊 Performance & Bundle Size

### Tree-Shaking Benefits

Toolkit is designed for **optimal tree-shaking**. Import only what you use:

```ts
// ✅ Good - Only includes chunk function (~0.5KB gzipped)
import { chunk } from '@vielzeug/toolkit';

// ⚠️ Avoid - Imports entire library (~50KB gzipped)
import * as toolkit from '@vielzeug/toolkit';
```

### Bundle Size by Category

| Category | Utilities | Approx. Size (gzipped) |
| -------- | --------- | ---------------------- |
| Array    | 25        | ~8KB                   |
| Async    | 10        | ~3KB                   |
| Date     | 3         | ~1KB                   |
| Function | 14        | ~5KB                   |
| Math     | 17        | ~4KB                   |
| Money    | 2         | ~1KB                   |
| Object   | 10        | ~3KB                   |
| Random   | 4         | ~4KB                   |
| String   | 7         | ~2KB                   |
| Typed    | 27        | ~3KB                   |

> **Note**: Sizes are approximate totals if you import all utilities from that category. Individual utilities are typically **0.1-0.8 KB gzipped** each. Actual bundle size depends on which utilities you import.

### Performance Characteristics

Most utilities are optimized for real-world usage:

- **Array operations**: O(n) for transforms/filters, O(n log n) for sorting
- **Object operations**: O(n) for shallow operations, O(depth × keys) for deep operations
- **String operations**: O(n) with minimal memory allocations
- **Type checks**: O(1) constant time checks
- **Function utilities**: Negligible overhead with proper memoization

> **Tip**: Specific performance characteristics and Big-O notation are documented for each utility where relevant.

## ❓ FAQ

### How is Toolkit different from Lodash?

Toolkit is **TypeScript-first** with modern JavaScript features (ES2020+), while Lodash predates TypeScript and targets older browsers. Key differences:

- **Better TypeScript**: First-class types with full inference vs. community-maintained `@types`
- **Smaller bundles**: Tree-shakeable by default vs. needing `lodash-es`
- **Async support**: Built-in Promise handling for `map`, `filter`, etc.
- **Modern API**: Uses native features where beneficial (e.g., `Promise.all`)

### Can I use Toolkit with JavaScript (not TypeScript)?

Absolutely! While built with TypeScript, Toolkit works perfectly in plain JavaScript. You just won't get compile-time type checking (but you'll still benefit from JSDoc hints in modern editors).

```js
// Works great in plain JavaScript!
import { chunk, group } from '@vielzeug/toolkit';

const batches = chunk([1, 2, 3, 4, 5], 2);
```

### Does Toolkit work in Node.js?

Yes! Toolkit is **isomorphic** and works in both browser and Node.js environments (v16.x and above recommended).

### How do I migrate from Lodash?

Most utilities have similar names and signatures. Key migration tips:

1. **Direct replacements**: `_.chunk` → `chunk`, `_.groupBy` → `group`, `_.debounce` → `debounce`
2. **TypeScript benefits**: Remove `@types/lodash` and get better inference
3. **Async operations**: Use built-in async support instead of `Promise.all` manually
4. **Import changes**: Use named imports instead of `_` namespace

See individual utility docs for specific migration notes.

### Is Toolkit production-ready?

**Yes!** Toolkit is:

- ✅ Battle-tested in production applications
- ✅ Comprehensive test coverage (>95%)
- ✅ Follows semantic versioning
- ✅ Actively maintained
- ✅ Zero known security vulnerabilities

### How often is Toolkit updated?

We follow **semantic versioning** and release:

- **Patch releases**: Bug fixes and docs (as needed)
- **Minor releases**: New utilities and features (monthly)
- **Major releases**: Breaking changes (rare, with migration guides)

Check the [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/toolkit/CHANGELOG.md) for recent updates.

## 🐛 Troubleshooting

### Tree-shaking not working

**Problem**: Your bundle includes more code than expected.

**Solution**: Ensure your bundler supports ES modules and tree-shaking:

```js
// vite.config.js
export default {
  build: {
    target: 'esnext',
    minify: 'terser',
  },
};
```

```js
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
};
```

### TypeScript errors with imports

**Problem**: Getting module resolution errors.

**Solution**: Make sure your `tsconfig.json` has modern module resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### Type inference not working

**Problem**: TypeScript doesn't infer types correctly.

**Solution**:

1. Ensure you're using TypeScript 5.0+
2. Don't use type assertions that hide inference
3. Let the utility infer types naturally:

```ts
// ❌ Don't do this
const result = map(items, (x) => x.name) as string[];

// ✅ Let TypeScript infer
const result = map(items, (x) => x.name); // Type: string[]
```

### Utilities not available in older browsers

**Problem**: Code breaks in older browsers (IE11, old Safari).

**Solution**: Toolkit targets modern JavaScript (ES2020+). For older browsers:

1. Use a transpiler (Babel, SWC):

```js
// babel.config.js
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: '> 0.25%, not dead',
      },
    ],
  ],
};
```

2. Or consider polyfills for specific features.

### Performance issues with large arrays

**Problem**: Operations are slow on very large datasets (100k+ items).

**Solution**:

- Use pagination (`chunk`) for rendering
- Consider streaming/lazy evaluation for massive datasets
- Profile with DevTools to identify bottlenecks
- Some utilities have specific performance notes in their docs

## 🤝 Contributing

Found a bug or want to add a utility? We welcome contributions!

- **Report bugs**: [GitHub Issues](https://github.com/helmuthdu/vielzeug/issues)
- **Suggest features**: [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- **Submit PRs**: See our [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md)

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Discussions & Questions](https://github.com/helmuthdu/vielzeug/discussions)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/toolkit/CHANGELOG.md)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/toolkit)

---

> **Tip:** Toolkit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for logging, HTTP clients, state management, and more.
