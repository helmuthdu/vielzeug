# @vielzeug/snapit

> Reactive state snapshots with selectors, computed values, child scopes, and test utilities

[![npm version](https://img.shields.io/npm/v/@vielzeug/snapit)](https://www.npmjs.com/package/@vielzeug/snapit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Snapit** is a lightweight reactive state container: create typed state with `createSnapshot`, subscribe to granular changes with selectors, derive computed values, and scope child states — all framework-agnostic.

## Installation

```sh
pnpm add @vielzeug/snapit
# npm install @vielzeug/snapit
# yarn add @vielzeug/snapit
```

## Quick Start

```typescript
import { createSnapshot } from '@vielzeug/snapit';

const state = createSnapshot({ count: 0, user: null as User | null });

// Read
console.log(state.get());              // { count: 0, user: null }
console.log(state.get(s => s.count));  // 0

// Write
state.set({ count: 1 });
state.set(s => ({ count: s.count + 1 }));

// Subscribe
const unsub = state.subscribe((current, previous) => {
  console.log('count changed:', current.count);
});

// Subscribe with selector (only fires when selector result changes)
const unsub2 = state.subscribe(
  s => s.count,
  (current, previous) => console.log(current, previous),
);
```

## Features

- ✅ **Selector subscriptions** — only re-run when selected slice changes
- ✅ **Computed values** — memoized derived state
- ✅ **Child states** — scoped sub-states that inherit and override parent
- ✅ **Scoped runs** — `runInScope(fn, patch)` for isolated state modifications
- ✅ **Test utilities** — `createTestState` and `withStateMock`
- ✅ **Immutable updates** — patch merges instead of direct mutation
- ✅ **Framework-agnostic** — works anywhere

## Usage

### Reading State

```typescript
const state = createSnapshot({ theme: 'light', locale: 'en' });

const all    = state.get();
const theme  = state.get(s => s.theme);
```

### Writing State

```typescript
// Partial patch
state.set({ theme: 'dark' });

// Updater function
state.set(s => ({ locale: s.locale === 'en' ? 'de' : 'en' }));

// Reset to initial values
state.reset();
```

### Computed Values

```typescript
const doubles = state.computed(s => s.count * 2);
console.log(doubles()); // always up-to-date derived value
```

### Child States

```typescript
const parent = createSnapshot({ theme: 'light', count: 0 });
const child  = parent.createChild({ count: 10 }); // overrides count, inherits theme

child.set({ count: 20 }); // only affects child scope
```

### Scoped Runs

```typescript
state.runInScope(
  (s) => ({ count: s.count + 100 }), // patch
  (scopedState) => {
    console.log(scopedState.get().count); // runs with patched values
  }
);
```

### Testing

```typescript
import { createTestState, withStateMock } from '@vielzeug/snapit';

const { state, dispose } = createTestState(baseState, { count: 99 });
// use state for tests
dispose();

// Temporary override
const result = withStateMock(state, { theme: 'dark' }, (s) => {
  return s.get(x => x.theme); // 'dark'
});
```

## API

### `createSnapshot(initial, options?)`

Returns a `State<T>` with:

| Method | Description |
|---|---|
| `get()` | Get full state |
| `get(selector)` | Get derived slice |
| `set(patch)` | Merge partial patch |
| `set(updater)` | Update via function |
| `reset()` | Restore initial state |
| `subscribe(listener)` | Subscribe to all changes |
| `subscribe(selector, listener, options?)` | Subscribe to selector changes |
| `computed(selector)` | Create a memoized computed accessor |
| `createChild(patch?)` | Create a child scope with overrides |
| `runInScope(patch, fn)` | Execute `fn` with temporarily patched state |

### Test Utilities

| Export | Description |
|---|---|
| `createTestState(base, patch?)` | Returns `{ state, dispose }` |
| `withStateMock(state, patch, fn)` | Run `fn` with a temporary state override |

## Documentation

Full docs at **[vielzeug.dev/snapit](https://vielzeug.dev/snapit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/snapit/usage) | Reading, writing, subscriptions |
| [API Reference](https://vielzeug.dev/snapit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/snapit/examples) | Real-world state patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
