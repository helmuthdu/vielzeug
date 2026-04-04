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

`store()` is a thin object helper over `signal()` with immutable-style updates.

```ts
import { store } from '@vielzeug/stateit';

const user = store({ profile: { name: 'Ada' }, count: 0 });

user.patch({ count: 1 });
user.update((state) => ({ ...state, count: state.count + 1 }));
user.reset();
```

## Watch Selector Overload

No intermediate selector signal is required.

```ts
import { store, watch } from '@vielzeug/stateit';

const cart = store({ count: 0, label: 'x' });

const stop = watch(
  cart,
  (state) => state.count,
  (next, prev) => {
    console.log(prev, '->', next);
  },
);

stop();
```

## Strict Runtime Rules

- `onCleanup()` throws when called outside an active effect.
- Reading a disposed computed signal throws.
- Store misuse (non-object values) throws.

## API

```ts
signal<T>(initial: T, options?: { equals?: (a: T, b: T) => boolean }): Signal<T>;
computed<T>(compute: () => T, options?: { equals?: (a: T, b: T) => boolean }): ComputedSignal<T>;
effect(fn: () => void | (() => void), options?: { maxIterations?: number }): Subscription;
watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
watch<S, T>(
  source: ReadonlySignal<S>,
  selector: (value: S) => T,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
batch<T>(fn: () => T): T;
untrack<T>(fn: () => T): T;
onCleanup(fn: () => void): void;
store<T extends object>(initial: T, options?: { equals?: (a: T, b: T) => boolean }): Store<T>;
readonly<T>(input: ReadonlySignal<T>): ReadonlySignal<T>;
writable<T>(input: Signal<T>): Signal<T>;
isSignal<T>(value: unknown): value is ReadonlySignal<T>;
peekValue<T>(input: T | ReadonlySignal<T>): T;
toValue<T>(input: T | ReadonlySignal<T> | (() => T)): T;
```
