---
title: 'Workit Examples — Using External Scripts (importScripts)'
description: 'Using External Scripts (importScripts) examples for workit.'
---

## Using External Scripts (importScripts)

## Problem

Implement using external scripts (importscripts) in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Use `scripts` to pull in CDN libraries without bundling them. The URLs are loaded via `importScripts()` before the task function runs, so their globals are available inside the worker:

```ts
import { createWorker } from '@vielzeug/workit';

// Single worker — lodash available as `_`
const slugify = createWorker<string, string>(
  (text) => {
    const lodash = (globalThis as any)._;
    return lodash.kebabCase(text);
  },
  {
    scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'],
  },
);

console.log(await slugify.run('Hello World')); // 'hello-world'
slugify.dispose();

// Pool — all workers share the same scripts list
const summarise = createWorker<{ sentences: string[] }, string>(
  ({ sentences }) => {
    const lodash = (globalThis as any)._;
    return sentences.map((s) => lodash.truncate(s, { length: 60 })).join(' ');
  },
  {
    size: 4,
    scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'],
  },
);

const results = await Promise.all(paragraphs.map((p) => summarise.run(p)));
summarise.dispose();
```

::: tip
Script URLs must be accessible from the Worker origin. For local development, host scripts via your dev server or use a CORS-enabled CDN.
:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
