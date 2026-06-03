---
title: SSR Setup
description: Server-side rendering with @vielzeug/orbit/ssr no-op stubs.
---

# SSR Setup

`@vielzeug/orbit` uses browser APIs (`getBoundingClientRect`, `ResizeObserver`, etc.) that are not available on the server. Importing the main package in a server bundle will cause build-time errors or runtime crashes.

Use the `@vielzeug/orbit/ssr` sub-path to get no-op stubs that have the same TypeScript signature but perform no DOM operations.

## Vite / Rollup Alias

The simplest approach is a build-time alias that swaps the import when bundling for SSR:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: process.env.SSR ? { '@vielzeug/orbit': '@vielzeug/orbit/ssr' } : {},
  },
});
```

## Manual Import Guard

If you need both SSR and client functionality in the same file, import conditionally:

```ts
import type { FloatHandle, FloatOptions, ReferenceElement } from '@vielzeug/orbit';

async function getFloat() {
  if (typeof window === 'undefined') {
    return (await import('@vielzeug/orbit/ssr')).float;
  }
  return (await import('@vielzeug/orbit')).float;
}
```

## What the Stubs Return

| Export            | SSR Return Value                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `computePosition` | `{ x: 0, y: 0, placement, middlewareData: {} }`                                          |
| `autoUpdate`      | `() => void` (no-op cleanup); `update` is never called                                   |
| `float`           | `FloatHandle` with no-op `cleanup`/`update`; `getPosition()` returns a zero-coord result |

The stub `FloatHandle` is fully typed — consuming code that calls `handle.cleanup()` or reads `handle.cssAnchor` will work identically on the server and the client.

## SvelteKit Example

```ts
// src/lib/orbit.ts
import type { float as FloatFn } from '@vielzeug/orbit';

let floatImpl: typeof FloatFn;

export async function loadFloat() {
  if (typeof window === 'undefined') {
    floatImpl = (await import('@vielzeug/orbit/ssr')).float;
  } else {
    floatImpl = (await import('@vielzeug/orbit')).float;
  }
  return floatImpl;
}
```

```svelte
<!-- Tooltip.svelte -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { FloatHandle } from '@vielzeug/orbit';
  import { flip, offset, shift } from '@vielzeug/orbit';
  import { loadFloat } from '$lib/orbit';

  let triggerEl: HTMLElement;
  let tooltipEl: HTMLElement;
  let handle: FloatHandle | null = null;

  onMount(async () => {
    const float = await loadFloat();
    handle = float(triggerEl, tooltipEl, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 6 })],
    });
  });

  onDestroy(() => handle?.cleanup());
</script>

<button bind:this={triggerEl}>Hover me</button>
<div bind:this={tooltipEl} role="tooltip">Content</div>
```
