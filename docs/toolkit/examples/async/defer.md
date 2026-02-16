<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.3KB-success" alt="Size">
</div>

# defer

Create a promise with externally accessible resolve and reject methods.

## Signature

```typescript
function defer<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};
```

## Returns

Object containing:

- `promise` – The promise instance
- `resolve` – Function to resolve the promise
- `reject` – Function to reject the promise

## Examples

### Basic Usage

```typescript
import { defer } from '@vielzeug/toolkit';
const deferred = defer<string>();
setTimeout(() => {
  deferred.resolve('Done!');
}, 1000);
const result = await deferred.promise;
console.log(result); // 'Done!'
```

### Event-Based Workflow

```typescript
import { defer } from '@vielzeug/toolkit';
const eventPromise = defer<Event>();
element.addEventListener(
  'click',
  (e) => {
    eventPromise.resolve(e);
  },
  { once: true },
);
const clickEvent = await eventPromise.promise;
console.log('Clicked at:', clickEvent.clientX, clickEvent.clientY);
```

### Manual Control with Error Handling

```typescript
import { defer } from '@vielzeug/toolkit';
const deferred = defer<number>();
if (someCondition) {
  deferred.resolve(42);
} else {
  deferred.reject(new Error('Condition not met'));
}
try {
  const value = await deferred.promise;
  console.log('Success:', value);
} catch (error) {
  console.error('Failed:', error);
}
```

### Multiple Subscribers

```typescript
import { defer } from '@vielzeug/toolkit';
const deferred = defer<string>();
// Multiple places can wait for the same promise
const promise1 = deferred.promise.then((result) => console.log('Handler 1:', result));
const promise2 = deferred.promise.then((result) => console.log('Handler 2:', result));
// Resolve once, both handlers execute
deferred.resolve('Shared result');
await Promise.all([promise1, promise2]);
```

## Related

- [race](./race.md) – Race promises with minimum delay
- [waitFor](./waitFor.md) – Poll for a condition to become true
