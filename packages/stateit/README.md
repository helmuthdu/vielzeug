# @vielzeug/stateit

Tiny reactive state with direct singleton primitives.

## Installation

```sh
pnpm add @vielzeug/stateit
```

## Usage

Stateit exports singleton primitives directly.

```ts
import { batch, computed, effect, signal } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

const stop = effect(() => {
  console.log(count.value, doubled.value);
});

batch(() => {
  count.value = 1;
  count.value = 2;
});

stop();
doubled.dispose();
```

## Store As Small Recipe

`store()` is a thin object helper over `signal()` with immutable-style updates. Stores expose the readable signal contract (`value`, `peek`, `subscribe`) plus object-focused mutation helpers.

```ts
import { store } from '@vielzeug/stateit';

const user = store({ profile: { name: 'Ada' }, count: 0 });

user.patch({ count: 1 });
user.update((state) => ({ ...state, count: state.count + 1 }));
user.reset();
```

## Watching Derived Values

Use `watch` with a getter function to watch any derived value directly:

```ts
import { store, watch } from '@vielzeug/stateit';

const cart = store({ count: 0, label: 'x' });

const stop = watch(() => cart.value.count, (next, prev) => {
  console.log(prev, '->', next);
});

stop();
```

## Interop Helpers

Stateit stays framework-agnostic, but the core exports are designed to plug directly into common reactive contracts.

```ts
import { computed, readonly, signal, toObservable, toStore } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

const publicCount = readonly(count);
const svelteStore = toStore(doubled);
const observable = toObservable(publicCount);
```

## Strict Runtime Rules

- `onCleanup()` throws when called outside an active effect.
- Reading a disposed computed signal throws.
- Store constructor/patch misuse (non-object values) throws.

## API

```ts
type ObservableObserver<T> = { next(value: T): void };
type ObservableLike<T> = {
  subscribe(observer: ObservableObserver<T> | ((value: T) => void)): { unsubscribe(): void };
};

signal<T>(initial: T, options?: { equals?: (a: T, b: T) => boolean }): Signal<T>;
computed<T>(compute: () => T, options?: { equals?: (a: T, b: T) => boolean }): ComputedSignal<T>;
effect(fn: () => void | (() => void)): Subscription;
watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
watch<T>(source: () => T, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
batch<T>(fn: () => T): T;
untrack<T>(fn: () => T): T;
readonly<T>(source: ReadonlySignal<T>): ReadonlySignal<T>;
toStore<T>(source: ReadonlySignal<T>): { subscribe(run: (value: T) => void): Subscription };
toObservable<T>(source: ReadonlySignal<T>): ObservableLike<T>;
onCleanup(fn: () => void): void;
scope(setup?: () => void): Scope;
store<T extends object>(initial: T): Store<T>;
isSignal<T>(value: unknown): value is ReadonlySignal<T>;
```
