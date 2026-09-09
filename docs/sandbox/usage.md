---
title: Sandbox — Usage Guide
description: Render untrusted HTML, push typed state, receive sandbox messages, update live content, and manage iframe lifecycle.
---

[[toc]]

## Basic Usage

Create a sandbox, subscribe before rendering, await readiness, and dispose it when finished.

```ts
import { createSandbox } from '@vielzeug/sandbox';

const container = document.getElementById('preview')!;
const sandbox = createSandbox(container);

sandbox.onMessage((message) => {
  if (message.type === 'error') console.error(message.message);
  if (message.type === 'resize') container.style.height = `${message.height}px`;
});

try {
  await sandbox.render('<main><h1>Preview</h1></main>');
} finally {
  sandbox.dispose();
}
```

The iframe is created by the first `render()` call. Each render creates a fresh document and resolves after its generated bridge reports ready.

## Rendering HTML

Use `render()` when scripts, styles, globals, and DOM state should reset together.

```ts
await sandbox.render(`
  <style>body { font-family: system-ui; }</style>
  <button id="save">Save</button>
  <script>
    document.querySelector('#save').addEventListener('click', () => {
      window.__sandbox__.emit('save');
    });
  </script>
`);
```

A newer render supersedes a pending one. Messages from the old document are ignored through the per-render generation marker.

## Pushing Typed State

Pass a state interface to `createSandbox()` and send partial updates with one object.

```ts
interface PreviewState {
  locale: string;
  theme: 'dark' | 'light';
  user: { name: string };
}

const sandbox = createSandbox<PreviewState>(container);
await sandbox.render('<main id="app"></main>');

sandbox.setState({
  locale: 'en',
  theme: 'dark',
  user: { name: 'Ada' },
});
```

Subscribe inside the iframe through the typed bridge.

```ts
interface PreviewState {
  locale: string;
  theme: 'dark' | 'light';
}

declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge<PreviewState>;
}

window.__sandbox__.onState('theme', (theme) => {
  document.documentElement.dataset.theme = theme;
});
```

Call `setState()` only after `render()` resolves. An early update can arrive before the generated bridge installs its listener and is dropped with a development warning.

## Receiving Sandbox Messages

Subscribe with `onMessage()` before rendering. The unsubscribe function detaches only that handler.

```ts
const unsubscribe = sandbox.onMessage((message) => {
  if (message.type === 'custom' && message.event === 'saved') {
    if (isSavedDetail(message.detail)) persist(message.detail.id);
  }
});

function isSavedDetail(value: unknown): value is { id: string } {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}
```

Custom event details remain `unknown` on the host. The iframe is isolated, but its code still controls message payloads.

Use `SandboxBridge<State, Events>` only to check authored sandbox-side calls.

```ts
interface Events {
  saved: { id: string };
}

declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge<Record<string, never>, Events>;
}

window.__sandbox__.emit('saved', { id: '42' });
```

## Updating Live Content

### Replace the body

Use `replaceBody()` when streamed HTML should preserve head scripts, styles, and global listeners.

```ts
await sandbox.render('<main>Waiting…</main>');

let html = '';
for await (const chunk of stream) {
  html += chunk;
  sandbox.replaceBody(html);
}
```

Replacement uses `document.body.innerHTML`. Scripts in replacement HTML do not execute, and body descendant state and listeners are discarded.

### Update a named style

Declare styles at construction and patch them without replacing the document.

```ts
const sandbox = createSandbox(container, {
  styles: { theme: 'body { color-scheme: light; }' },
});

await sandbox.render('<main>Preview</main>');
sandbox.updateStyle('theme', 'body { color-scheme: dark; }');
```

Calling `updateStyle()` before the first render updates the render baseline. Unknown IDs emit a development warning.

## Injecting Scripts and Configuring CSP

List absolute external scripts in `scripts`. Their origins are added to `script-src` automatically.

```ts
const sandbox = createSandbox(container, {
  allowedFontOrigins: ['https://fonts.gstatic.com'],
  allowedStyleOrigins: ['https://fonts.googleapis.com'],
  scripts: ['https://cdn.example.com/widget.js'],
});
```

Network requests remain blocked by `connect-src 'none'`. The package does not expose arbitrary CSP directives.

A nonce authorizes the generated bridge while preventing un-nonced inline user scripts in CSP Level 3 browsers.

```ts
const sandbox = createSandbox(container, {
  nonce: crypto.randomUUID(),
});
```

## Handling Errors and Timeouts

`render()` rejects if the document does not become ready before `readyTimeout`.

```ts
import { SandboxError, SandboxTimeoutError } from '@vielzeug/sandbox';

try {
  await sandbox.render(html);
} catch (error) {
  if (error instanceof SandboxTimeoutError) {
    showError('A script blocked preview initialization.');
  } else if (error instanceof SandboxError) {
    showError(error.message);
  }
}
```

Uncaught iframe errors and unhandled rejections arrive through `onMessage()` as untrusted `error` messages.

## Disposal

Use `dispose()` or a `using` declaration to remove the iframe and host listeners.

```ts
using sandbox = createSandbox(container);
await sandbox.render('<p>Temporary preview</p>');
```

Tie other asynchronous work to `disposalSignal`.

```ts
const response = await fetch('/preview-data', {
  signal: sandbox.disposalSignal,
});
```

## Testing

Use the testing subpath to complete `render()` and simulate messages in jsdom.

```ts
import { createSandbox } from '@vielzeug/sandbox';
import { createSandboxTestHelpers } from '@vielzeug/sandbox/testing';
import { expect, it } from 'vitest';

it('receives resize messages', async () => {
  const container = document.createElement('div');
  const sandbox = createSandbox(container);
  const helpers = createSandboxTestHelpers(container);
  const heights: number[] = [];

  sandbox.onMessage((message) => {
    if (message.type === 'resize') heights.push(message.height);
  });

  const render = sandbox.render('<p>Preview</p>');
  helpers.fireReady();
  await render;
  helpers.fireResize(240);

  expect(heights).toEqual([240]);
  sandbox.dispose();
});
```

## Framework Integration

Own one sandbox per mounted component and dispose it during unmount.

::: code-group

```tsx [React]
import { createSandbox, type SandboxHandle } from '@vielzeug/sandbox';
import { useEffect, useRef } from 'react';

export function Preview({ html }: { html: string }) {
  const container = useRef<HTMLDivElement>(null);
  const sandbox = useRef<SandboxHandle>();

  useEffect(() => {
    sandbox.current = createSandbox(container.current!);
    return () => sandbox.current?.dispose();
  }, []);

  useEffect(() => {
    void sandbox.current?.render(html).catch(console.error);
  }, [html]);

  return <div ref={container} />;
}
```

```vue [Vue]
<script setup lang="ts">
import { createSandbox, type SandboxHandle } from '@vielzeug/sandbox';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ html: string }>();
const container = ref<HTMLElement>();
let sandbox: SandboxHandle | undefined;

onMounted(() => {
  sandbox = createSandbox(container.value!);
  void sandbox.render(props.html).catch(console.error);
});
watch(() => props.html, (html) => void sandbox?.render(html).catch(console.error));
onUnmounted(() => sandbox?.dispose());
</script>

<template><div ref="container" /></template>
```

```svelte [Svelte]
<script lang="ts">
  import { createSandbox, type SandboxHandle } from '@vielzeug/sandbox';
  import { onMount } from 'svelte';

  export let html: string;
  let container: HTMLElement;
  let sandbox: SandboxHandle | undefined;

  onMount(() => {
    sandbox = createSandbox(container);
    return () => sandbox?.dispose();
  });

  $: if (sandbox) void sandbox.render(html).catch(console.error);
</script>

<div bind:this={container}></div>
```

:::

## Working with Other Vielzeug Libraries

Use Sandbox to isolate generated markup that loads browser bundles of DOM-output packages such as Refine or Ore. Use Rune in the host to record validated message details; do not pass untrusted payloads directly to structured logs.

## Best Practices

- Await `render()` before sending state or replacing body content.
- Narrow every custom message detail at the host boundary.
- Prefer `setState()` for data changes and `updateStyle()` for CSS changes.
- Use `render()` when scripts or global state must reset.
- Handle `SandboxTimeoutError` at every non-test render boundary.
- Dispose one sandbox with each owning component.
- Tie related asynchronous work to `disposalSignal`.
- Keep network access blocked unless the application requires a different isolation model.
