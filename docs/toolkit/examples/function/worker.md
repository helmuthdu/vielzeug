<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-612_B-success" alt="Size">
</div>

# worker

The `worker` utility simplifies the use of Web Workers by allowing you to run heavy computations in a background thread without creating separate files. It supports importing external dependencies and handles all the complex message-passing logic for you.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/worker.ts
:::

## Features

- **Browser Only**: Leverages the native Web Worker API.
- **Background Execution**: Offloads CPU-intensive tasks to prevent UI freezing.
- **Integrated Dependencies**: Import external scripts directly into the worker environment.
- **Promise-based**: Call background functions as if they were local async functions.

## API

```ts
interface WorkerFunction {
  <T extends (...args: any[]) => any>(
    callback: (context: any) => T,
    dependencies?: string[]
  ): (...args: any[]) => Promise<any>
}
```

### Parameters

- `callback`: A factory function that runs *inside* the worker. It receives a context (including `self`) and must return the function that will perform the work.
- `dependencies`: Optional. An array of URLs for external scripts to be imported into the worker using `importScripts`.

### Returns

- A new function that, when called, executes the logic in a Web Worker and returns a Promise with the result.

## Examples

### Heavy Data Processing

```ts
import { worker } from '@vielzeug/toolkit';

// This function will run in a separate thread
const processLargeDataset = worker(() => {
  return (data: number[]) => {
    // Perform complex calculations...
    return data.map(n => Math.sqrt(n) * Math.PI).reduce((a, b) => a + b);
  };
});

const result = await processLargeDataset([1, 2, 3, 4, 5, 6]);
```

### Using External Libraries

```ts
import { worker } from '@vielzeug/toolkit';

const calculateHash = worker(() => {
  return (text: string) => {
    // Logic goes here
    return text;
  };
});

const hash = await calculateHash('Hello World');
```

## Implementation Notes

- Creates a `Blob` from the stringified function to instantiate the Worker.
- Automatically terminates the internal worker instance after the task is complete (depending on implementation details, usually stays alive for reuse if optimized).
- Throws an error if used in an environment without `Worker` support (e.g., standard Node.js).

## See Also

- [predict](./predict.md): Wait for async conditions.
- [retry](./retry.md): Re-run failed operations.
- [attempt](./attempt.md): Safely execute logic that might crash.