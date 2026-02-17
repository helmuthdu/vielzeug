<PackageBadges package="toolkit" />

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

| Feature                | Toolkit                                               | Lodash            | Ramda             | Native JS  |
| ---------------------- | ----------------------------------------------------- | ----------------- | ----------------- | ---------- |
| Dependencies           | <PackageInfo package="toolkit" type="dependencies" /> | 0                 | 0                 | N/A        |
| Bundle Size (min+gzip) | ~0.1-1KB per utility                                  | ~26KB (full)      | ~16KB (full)      | 0KB        |
| TypeScript             | ✅ Native                                             | ⚠️ Via @types     | ⚠️ Via @types     | ❌ Limited |
| Async Support          | ✅ Built-in                                           | ❌ Limited        | ❌ Limited        | ⚠️ Manual  |
| Isomorphic             | ✅ Browser + Node.js                                  | ✅ Yes            | ✅ Yes            | ✅ Yes     |
| Tree-shakeable         | ✅ By default                                         | ⚠️ lodash-es only | ✅ Yes            | N/A        |
| Learning Curve         | Low                                                   | Low               | High (FP focused) | Low        |

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

- **100+ Utilities**: Covering all common data structures and tasks. See [API Reference](./api.md#array-utilities).
- **Isomorphic**: Works perfectly in both the Browser and Node.js.
- **Tree-shakeable**: Only include the code you actually use. See [Basic Usage](./usage.md#basic-usage).
- **Type-safe**: Built with TypeScript for excellent developer experience. See [TypeScript Configuration](./usage.md#typescript-configuration).
- **Zero Dependencies**: Lightweight and secure.

## 🏁 Quick Start

```ts
import { chunk, group, debounce } from '@vielzeug/toolkit';

// Split array into chunks
const chunks = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Group by property
const users = [
  { id: 1, role: 'admin' },
  { id: 2, role: 'user' },
];
const grouped = group(users, (u) => u.role); // { admin: [...], user: [...] }

// Debounce function
const search = debounce((query) => fetchResults(query), 300);
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for category-specific imports and patterns
- Check [API Reference](./api.md) for complete utility list (100+ functions)
- Browse [Examples](./examples.md) for real-world use cases
  :::

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
// ✅ Good – Only includes chunk function (~0.5KB gzipped)
import { chunk } from '@vielzeug/toolkit';

// ⚠️ Avoid – Imports entire library (~50KB gzipped)
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

::: danger Problem
Your bundle includes more code than expected.
:::

::: tip Solution
Ensure your bundler supports ES modules and tree-shaking:

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

:::

### TypeScript errors with imports

::: danger Problem
Getting module resolution errors.
:::

::: tip Solution
Make sure your `tsconfig.json` has modern module resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

:::

### Type inference not working

::: danger Problem
TypeScript doesn't infer types correctly.
:::

::: tip Solution
Follow these best practices:

1. Ensure you're using TypeScript 5.0+
2. Don't use type assertions that hide inference
3. Let the utility infer types naturally:

```ts
// ❌ Don't do this
const result = map(items, (x) => x.name) as string[];

// ✅ Let TypeScript infer
const result = map(items, (x) => x.name); // Type: string[]
```

:::

### Utilities not available in older browsers

::: danger Problem
Code breaks in older browsers (IE11, old Safari).
:::

::: tip Solution
Toolkit targets modern JavaScript (ES2020+). For older browsers:

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

:::

### Performance issues with large arrays

::: danger Problem
Operations are slow on very large datasets (100k+ items).
:::

::: tip Solution
Optimize for large datasets:

- Use pagination (`chunk`) for rendering
- Consider streaming/lazy evaluation for massive datasets
- Profile with DevTools to identify bottlenecks
- Some utilities have specific performance notes in their docs

:::

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
