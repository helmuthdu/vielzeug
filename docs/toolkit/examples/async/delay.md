<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.2KB-success" alt="Size">
</div>

# delay

Delay the execution of a function by a specified amount of time.

## Signature

```typescript
function delay<T extends Fn>(fn: T, delay?: number): Promise<ReturnType<T>>;
```

## Parameters

- `fn` – The function to be delayed
- `delay` – The amount of time to delay the function execution, in milliseconds (default: 700)

## Returns

A Promise that resolves with the result of the function execution.

## Examples

### Basic Usage

```typescript
import { delay } from '@vielzeug/toolkit';
const log = () => console.log('Hello, world!');
delay(log, 1000); // Logs 'Hello, world!' after 1 second
```

### With Async Function

```typescript
import { delay } from '@vielzeug/toolkit';
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
const result = await delay(fetchData, 500);
console.log(result); // Data fetched after 500ms delay
```

### Custom Delay

```typescript
import { delay } from '@vielzeug/toolkit';
// Process data after 2 seconds
await delay(() => processData(), 2000);
console.log('Processing started after 2 seconds');
```

### With Return Value

```typescript
import { delay } from '@vielzeug/toolkit';
const calculate = () => 42;
const result = await delay(calculate, 1000);
console.log(result); // 42 (after 1 second)
```

## Related

- [sleep](./sleep.md) – Simple async delay without function execution
- [attempt](./attempt.md) – Execute function with error handling and retry
