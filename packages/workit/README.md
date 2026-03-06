# @vielzeug/workit

> Type-safe Web Worker abstraction with task queuing and concurrency control

[![npm version](https://img.shields.io/npm/v/@vielzeug/workit)](https://www.npmjs.com/package/@vielzeug/workit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Workit** wraps Web Workers in a clean, fully-typed async API. Define a task function once — workit handles worker creation, message passing, timeouts, cancellation, and pooling. Falls back to main-thread execution gracefully when Workers are unavailable (SSR, tests).

## Installation

```sh
pnpm add @vielzeug/workit
# npm install @vielzeug/workit
# yarn add @vielzeug/workit
```

## Quick Start

```typescript
import { createWorker, createWorkerPool } from '@vielzeug/workit';

// Single worker
const worker = createWorker<number[], number>(
  (nums) => nums.reduce((a, b) => a + b, 0),
);
const sum = await worker.run([1, 2, 3, 4, 5]); // 15

// Worker pool — 4 concurrent workers
const pool = createWorkerPool<number, number>(
  (n) => fibonacci(n),
  { size: 4 },
);
const results = await pool.runAll([35, 36, 37, 38]);
```

## Features

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Graceful fallback** — runs tasks in the main thread when Workers are not available
- **Worker pool** — distribute tasks across N workers with built-in queuing
- **Timeout support** — reject tasks that exceed a configurable time limit
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Testing utilities** — `createTestWorker` runs tasks synchronously without Worker overhead
- **Zero dependencies** — no supply chain risk, minimal bundle size

## API

### `createWorker(fn, options?)`

Creates a worker that runs `fn` in a Web Worker (or main thread as fallback).

```typescript
const worker = createWorker<TInput, TOutput>(fn, {
  timeout?: number,    // ms before task rejects (default: none)
  fallback?: boolean,  // allow main-thread fallback (default: true)
});

await worker.run(input);  // returns Promise<TOutput>
worker.status;            // 'idle' | 'running' | 'terminated'
worker.terminate();       // reject pending + clean up
```

### `createWorkerPool(fn, options?)`

Creates a pool of N workers. Tasks are queued and dispatched to the next available worker.

```typescript
const pool = createWorkerPool<TInput, TOutput>(fn, {
  size?: number,       // worker count (default: navigator.hardwareConcurrency ?? 4)
  timeout?: number,
  fallback?: boolean,
});

await pool.run(input, signal?);             // single task
await pool.runAll([input1, input2], signal?); // concurrent, results in order
pool.size;             // number of slots
pool.terminate();      // reject all queued + running tasks
```

### `createTestWorker(fn)`

Test utility that runs `fn` directly in the same thread and records all calls.

```typescript
const { worker, calls, dispose } = createTestWorker<TInput, TOutput>(fn);

await worker.run(input);
calls; // [{ input, output }, ...]
dispose(); // terminates the worker
```

## Documentation

- [Usage Guide](https://helmuthdu.github.io/vielzeug/workit/usage)
- [API Reference](https://helmuthdu.github.io/vielzeug/workit/api)
- [Examples](https://helmuthdu.github.io/vielzeug/workit/examples)

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)


const result = UserSchema.parse({ name: 'Alice', email: 'alice@example.com', role: 'admin' });

if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.log(result.errors); // [{ path, message }]
}
```

## Features

- ✅ **Rich primitives** — `string`, `number`, `boolean`, `date`, `literal`, `enum`, `unknown`
- ✅ **Composite types** — `object`, `array`, `tuple`, `union`, `intersection`, `record`
- ✅ **Modifiers** — `.optional()`, `.nullable()`, `.default(val)`
- ✅ **String rules** — `.min()`, `.max()`, `.length()`, `.email()`, `.url()`, `.regex()`, `.trim()`
- ✅ **Number rules** — `.min()`, `.max()`, `.int()`, `.positive()`, `.negative()`
- ✅ **Type inference** — `Infer<typeof schema>` gives the exact TypeScript type
- ✅ **Zero dependencies** — pure TypeScript, ~2 KB gzipped

## Usage

### Primitives

```typescript
import { v } from '@vielzeug/validit';

const name     = v.string().min(1).max(100).trim();
const age      = v.number().int().min(0).max(120);
const active   = v.boolean();
const joinedAt = v.date();
const status   = v.enum(['active', 'inactive', 'pending']);
```

### Objects

```typescript
const AddressSchema = v.object({
  street: v.string(),
  city:   v.string(),
  zip:    v.string().regex(/^\d{5}$/),
});

const PersonSchema = v.object({
  name:    v.string().min(1),
  address: AddressSchema,
  phone:   v.string().optional(),
});

type Person = Infer<typeof PersonSchema>;
```

### Arrays and Tuples

```typescript
const TagsSchema  = v.array(v.string().min(1));
const PointSchema = v.tuple([v.number(), v.number()]);
```

### Union and Intersection

```typescript
const IdSchema = v.union([v.string(), v.number()]);

const AdminSchema = v.intersection([UserSchema, v.object({ permissions: v.array(v.string()) })]);
```

### Safe Parse vs. Parse

```typescript
// safeParse — never throws, returns { success, data?, errors? }
const result = schema.safeParse(input);
if (!result.success) console.log(result.errors);

// parse — throws ValidationError on failure
const data = schema.parse(input);
```

### Custom Validators

```typescript
const PasswordSchema = v.string().refine(
  (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
  'Password must contain an uppercase letter and a digit'
);
```

## API

| Export | Description |
|---|---|
| `v.string()` | String schema with chainable rules |
| `v.number()` | Number schema |
| `v.boolean()` | Boolean schema |
| `v.date()` | Date schema |
| `v.literal(val)` | Exact value schema |
| `v.enum(values)` | Enum schema from string array |
| `v.object(shape)` | Object schema |
| `v.array(item)` | Array schema |
| `v.tuple(items)` | Fixed-length tuple schema |
| `v.union(schemas)` | Union (OR) schema |
| `v.intersection(schemas)` | Intersection (AND) schema |
| `v.record(key, value)` | Record/dictionary schema |
| `v.unknown()` | Passes any value |
| `Infer<T>` | Extract TypeScript type from schema |

## Documentation

Full docs at **[vielzeug.dev/validit](https://vielzeug.dev/validit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/validit/usage) | Primitives, objects, modifiers |
| [API Reference](https://vielzeug.dev/validit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/validit/examples) | Real-world validation patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
