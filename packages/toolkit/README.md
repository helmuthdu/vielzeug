# @vielzeug/toolkit

A comprehensive, type-safe utility library for modern JavaScript and TypeScript.

## ✨ Features

- 🎯 **119 Type-Safe Utilities** – Covering arrays, objects, strings, async operations, and more
- 📦 **Tree-Shakable** – Import only what you need, minimize bundle size
- 🔒 **Zero Dependencies** – No supply chain risks, no version conflicts
- 💪 **Full TypeScript Support** – Complete type inference and safety
- ⚡ **Async-First** – Built-in support for promises and async operations
- 🧪 **Battle-Tested** – >95% test coverage, production-ready
- 🌐 **Isomorphic** – Works in both browser and Node.js environments

## 🆚 Comparison with Alternatives

| Feature                | Toolkit          | Lodash            | Ramda             | Native JS  |
| ---------------------- | ---------------- | ----------------- | ----------------- | ---------- |
| TypeScript Support     | ✅ First-class   | ⚠️ Via @types     | ⚠️ Via @types     | ❌ Limited |
| Tree-shakeable         | ✅ By default    | ⚠️ lodash-es only | ✅ Yes            | N/A        |
| Bundle Size (min+gzip) | ~0.1-1KB/utility | ~24KB (full)      | ~12KB (full)      | 0KB        |
| Dependencies           | 0                | 0                 | 0                 | N/A        |
| Async Support          | ✅ Built-in      | ❌ Limited        | ❌ Limited        | ⚠️ Manual  |
| Learning Curve         | Low              | Low               | High (FP focused) | Low        |

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/toolkit
# npm
npm install @vielzeug/toolkit
# yarn
yarn add @vielzeug/toolkit
```

## 🚀 Quick Start

```typescript
import { chunk, map, retry, pool } from '@vielzeug/toolkit';

// Array operations
const batches = chunk([1, 2, 3, 4, 5], 2);
// [[1, 2], [3, 4], [5]]

// Async map with automatic Promise handling
const users = await map([1, 2, 3], async (id) => fetchUser(id));

// Retry with exponential backoff
const data = await retry(() => fetch('/api/data').then((r) => r.json()), { times: 3, delay: 1000, backoff: 2 });

// Rate limiting with promise pool
const apiPool = pool(5); // Max 5 concurrent requests
const results = await Promise.all(urls.map((url) => apiPool(() => fetch(url))));
```

## Categories

### 📊 Array (25 utilities)

Transform, filter, group, and manipulate arrays with full type safety.

```typescript
import { group, uniq, flatten, sort } from '@vielzeug/toolkit';

// Group by property
const grouped = group(users, (user) => user.role);

// Remove duplicates
const unique = uniq([1, 2, 2, 3, 3, 3]);

// Flatten nested arrays
const flat = flatten([
  [1, 2],
  [3, [4, 5]],
]);

// Sort with custom comparator
const sorted = sort(items, (a, b) => a.price – b.price);
```

**Available utilities:**
`aggregate`, `alternate`, `arrange`, `chunk`, `compact`, `contains`, `every`, `filter`, `find`, `findIndex`, `findLast`, `flatten`, `group`, `list`, `map`, `pick`, `reduce`, `remoteList`, `search`, `select`, `shift`, `some`, `sort`, `substitute`, `uniq`

---

### ⚡ Async (11 utilities)

Promise utilities, concurrency control, retries, and async patterns.

```typescript
import { parallel, queue, waitFor, race, defer } from '@vielzeug/toolkit';

// Process with controlled concurrency
await parallel(3, urls, async (url) => fetch(url));

// Task queue with monitoring
const taskQueue = queue({ concurrency: 5 });
taskQueue.add(() => processTask());
await taskQueue.onIdle();

// Wait for condition
await waitFor(() => document.querySelector('#app') !== null);

// Race with minimum delay (better UX)
const data = await race(fetchData(), 500);

// Externally-controlled promise
const deferred = defer<string>();
setTimeout(() => deferred.resolve('Done!'), 1000);
```

**Available utilities:**
`attempt`, `defer`, `delay`, `parallel`, `pool`, `predict`, `queue`, `race`, `retry`, `sleep`, `waitFor`

---

### 📅 Date (3 utilities)

Date manipulation and time calculations.

```typescript
import { interval, timeDiff, expires } from '@vielzeug/toolkit';

// Calculate time intervals
const days = interval(new Date('2024-01-01'), new Date('2024-12-31'), 'days');

// Time difference
const diff = timeDiff(date1, date2);

// Check expiration
if (expires(expiryDate)) {
  // Handle expired
}
```

**Available utilities:**
`expires`, `interval`, `timeDiff`

---

### ⚙️ Function (14 utilities)

Function composition, memoization, and execution control.

```typescript
import { debounce, throttle, memo, pipe, curry } from '@vielzeug/toolkit';

// Debounce user input
const search = debounce((query) => fetchResults(query), 300);

// Throttle scroll events
const onScroll = throttle(() => updateUI(), 100);

// Memoize expensive calculations
const fibonacci = memo((n) => (n <= 1 ? n : fibonacci(n – 1) + fibonacci(n – 2)));

// Function composition
const transform = pipe(
  (x) => x * 2,
  (x) => x + 1,
  (x) => x.toString(),
);

// Currying
const add = curry((a, b, c) => a + b + c);
const add5 = add(5);
```

**Available utilities:**
`assert`, `assertParams`, `compare`, `compareBy`, `compose`, `curry`, `debounce`, `fp`, `memo`, `once`, `pipe`, `proxy`, `prune`, `throttle`, `worker`

---

### 🔢 Math (17 utilities)

Mathematical operations, statistics, and calculations.

```typescript
import { average, median, clamp, range, distribute } from '@vielzeug/toolkit';

// Calculate average
const avg = average([1, 2, 3, 4, 5]); // 3

// Find median
const med = median([1, 2, 3, 4, 5]); // 3

// Clamp value to range
const clamped = clamp(150, 0, 100); // 100

// Generate range
const numbers = range(1, 10); // [1, 2, 3, ..., 10]

// Distribute amount
const shares = distribute(100, 3); // [33.33, 33.33, 33.34]
```

**Available utilities:**
`abs`, `add`, `allocate`, `average`, `boil`, `clamp`, `distribute`, `divide`, `max`, `median`, `min`, `multiply`, `range`, `rate`, `round`, `subtract`, `sum`

---

### 💰 Money (3 utilities)

Currency formatting and exchange calculations.

```typescript
import { currency, exchange } from '@vielzeug/toolkit';

// Format currency
const formatted = currency(1234.56, 'USD'); // "$1,234.56"

// Currency exchange
const converted = exchange(100, 'USD', 'EUR', 0.85); // 85
```

**Available utilities:**
`currency`, `exchange`, `types`

---

### 📦 Object (10 utilities)

Deep merging, cloning, diffing, and object manipulation.

```typescript
import { merge, clone, diff, path, seek } from '@vielzeug/toolkit';

// Deep merge
const merged = merge(obj1, obj2);

// Deep clone
const copy = clone(original);

// Diff objects
const changes = diff(oldObj, newObj);

// Get nested value
const value = path(obj, 'user.address.city');

// Search object
const results = seek(data, (val) => val > 100);
```

**Available utilities:**
`cache`, `clone`, `diff`, `entries`, `keys`, `merge`, `parseJSON`, `path`, `seek`, `values`

---

### 🎲 Random (4 utilities)

Random values, shuffling, and UUID generation.

```typescript
import { random, shuffle, draw, uuid } from '@vielzeug/toolkit';

// Random number
const num = random(1, 100);

// Shuffle array
const shuffled = shuffle([1, 2, 3, 4, 5]);

// Draw random items
const winners = draw(participants, 3);

// Generate UUID
const id = uuid(); // "550e8400-e29b-41d4-a716-446655440000"
```

**Available utilities:**
`draw`, `random`, `shuffle`, `uuid`

---

### 📝 String (6 utilities)

String formatting, case conversion, and similarity.

```typescript
import { camelCase, kebabCase, pascalCase, snakeCase, truncate, similarity } from '@vielzeug/toolkit';

// Case conversions
camelCase('hello world'); // "helloWorld"
kebabCase('hello world'); // "hello-world"
pascalCase('hello world'); // "HelloWorld"
snakeCase('hello world'); // "hello_world"

// Truncate text
truncate('Long text here', 10); // "Long text..."

// String similarity
similarity('hello', 'hallo'); // 0.8
```

**Available utilities:**
`camelCase`, `kebabCase`, `pascalCase`, `similarity`, `snakeCase`, `truncate`

---

### ✅ Typed (27 utilities)

Type guards, type checking, and validation.

```typescript
import { isString, isArray, isPromise, isEmpty, isEqual } from '@vielzeug/toolkit';

// Type guards with narrowing
if (isString(value)) {
  // TypeScript knows value is string
  console.log(value.toUpperCase());
}

// Check arrays
if (isArray(data)) {
  data.forEach((item) => console.log(item));
}

// Promise detection
if (isPromise(result)) {
  await result;
}

// Empty check
if (isEmpty(obj)) {
  // Handle empty
}

// Deep equality
if (isEqual(obj1, obj2)) {
  // Objects are equal
}
```

**Available utilities:**
`ge`, `gt`, `is`, `isArray`, `isBoolean`, `isDate`, `isDefined`, `isEmpty`, `isEqual`, `isEven`, `isFunction`, `isNegative`, `isNil`, `isNumber`, `isObject`, `isOdd`, `isPositive`, `isPrimitive`, `isPromise`, `isRegex`, `isString`, `isWithin`, `isZero`, `le`, `lt`, `typeOf`

## Real-World Examples

### API Rate Limiting with Retry

```typescript
import { pool, retry, predict } from '@vielzeug/toolkit';

// Create rate-limited pool
const apiPool = pool(10); // Max 10 concurrent requests

async function fetchWithRetry(url: string) {
  return apiPool(() =>
    retry(
      () =>
        predict(
          async (signal) => {
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          },
          { timeout: 5000 },
        ),
      { times: 3, delay: 1000, backoff: 2 },
    ),
  );
}

// Process many URLs with rate limiting and retry
const results = await Promise.all(urls.map((url) => fetchWithRetry(url)));
```

### Batch Processing with Progress

```typescript
import { chunk, parallel, sleep } from '@vielzeug/toolkit';

async function processBatch(items: any[], batchSize = 10) {
  const batches = chunk(items, batchSize);
  const results = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}`);

    const batchResults = await parallel(3, batches[i], async (item) => {
      return await processItem(item);
    });

    results.push(...batchResults);

    // Delay between batches
    if (i < batches.length – 1) {
      await sleep(1000);
    }
  }

  return results;
}
```

### Form Validation Pipeline

```typescript
import { pipe, curry, isEmpty, isString } from '@vielzeug/toolkit';

const required = (value: any) => {
  if (isEmpty(value)) throw new Error('Required field');
  return value;
};

const minLength = curry((min: number, value: string) => {
  if (!isString(value) || value.length < min) {
    throw new Error(`Minimum ${min} characters`);
  }
  return value;
});

const email = (value: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Invalid email');
  }
  return value;
};

// Create validation pipeline
const validateEmail = pipe(required, minLength(5), email);

try {
  const validEmail = validateEmail(userInput);
} catch (error) {
  console.error(error.message);
}
```

## Performance & Bundle Size

### Tree-Shaking

Toolkit is designed for optimal tree-shaking. Import only what you use:

```typescript
// ✅ Good – Only includes chunk function (~0.5KB gzipped)
import { chunk } from '@vielzeug/toolkit';

// ⚠️ Avoid – Imports entire library (~35KB gzipped)
import * as toolkit from '@vielzeug/toolkit';
```

### Bundle Size by Category

| Category | Utilities | Approx. Size (gzipped) |
| -------- | --------- | ---------------------- |
| Array    | 25        | ~8KB                   |
| Async    | 11        | ~3KB                   |
| Date     | 3         | ~1KB                   |
| Function | 14        | ~5KB                   |
| Math     | 17        | ~4KB                   |
| Money    | 3         | ~1KB                   |
| Object   | 10        | ~3KB                   |
| Random   | 4         | ~1KB                   |
| String   | 6         | ~2KB                   |
| Typed    | 27        | ~3KB                   |

> **Note**: Individual utilities are typically **0.1-0.8 KB gzipped** each.

## TypeScript Support

Full TypeScript support with complete type inference:

```typescript
import { map, filter, group } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5];

// Type inferred as number[]
const doubled = map(numbers, (n) => n * 2);

// Type inferred as number[]
const evens = filter(numbers, (n) => n % 2 === 0);

// Type inferred as Record<string, User[]>
const byRole = group(users, (u) => u.role);

// Async operations automatically return Promise
const results = await map(ids, async (id) => fetchUser(id));
// Type: Promise<User[]>
```

## Documentation

- **[Full Documentation](https://helmuthdu.github.io/vielzeug/toolkit/)**
- **[API Reference](https://helmuthdu.github.io/vielzeug/toolkit/api)**
- **[Usage Guide](https://helmuthdu.github.io/vielzeug/toolkit/usage)**
- **[Examples](https://helmuthdu.github.io/vielzeug/toolkit/examples/array)**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

## 📖 Documentation

- [**Full Documentation**](https://helmuthdu.github.io/vielzeug/toolkit)
- [**Usage Guide**](https://helmuthdu.github.io/vielzeug/toolkit/usage)
- [**API Reference**](https://helmuthdu.github.io/vielzeug/toolkit/api)
- [**Examples**](https://helmuthdu.github.io/vielzeug/toolkit/examples)

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🤝 Contributing

Contributions are welcome! Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 🔗 Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://helmuthdu.github.io/vielzeug/deposit)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/deposit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem – A collection of type-safe utilities for modern web development.
