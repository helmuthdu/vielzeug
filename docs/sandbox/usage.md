---
title: Sandbox — Usage Guide
description: How to render AI-generated HTML, pass state, handle errors, configure CSP, and integrate the sandbox with your application.
---

[[toc]]

::: tip New to Sandbox?
Start with the [Overview](./index.md) for installation and a quick example, then come back here for in-depth usage patterns.
:::

## Basic Usage

Create a sandbox by passing a container element. The returned `SandboxHandle` is your entire interface to the iframe.

```ts
import { createSandbox } from '@vielzeug/sandbox';

const container = document.getElementById('preview')!;
const sandbox = createSandbox(container);

await sandbox.ready;
sandbox.render('<p>Hello from the sandbox</p>');
```

`sandbox.ready` resolves when the **first** render loads. No DOM is created until `render()` is called — `createSandbox()` is a cheap factory.

For reactive frameworks, subscribe via `onMessage` to receive `error` and `custom` events.

## Rendering HTML

`render(html)` replaces the entire sandboxed document with a new one containing your HTML in the body.

```ts
sandbox.render(`
  <style>body { font-family: sans-serif; }</style>
  <h1>AI-Generated Component</h1>
  <ore-button variant="primary">Click me</ore-button>
`);
```

Each call to `render()` is a full page reset — scripts reinitialise, CSS is re-applied, and any DOM state is lost. For incremental updates, push state via `setState()` rather than re-rendering.

## Passing State

`setState(key, value)` pushes data into the sandbox without re-rendering.

Always call `setState()` after `ready` (or after checking `sandbox.loaded`) — calling it before the bridge finishes initializing will silently drop the update in a real browser, and a dev warning will fire.

```ts
// Correct: await ready before pushing state
await sandbox.ready;
sandbox.setState('theme', 'dark');
sandbox.setState('user', { name: 'Alice' });

// Correct: check loaded for synchronous callers
if (sandbox.loaded) {
  sandbox.setState('count', counter);
}
```

Inside the sandbox document, listen for the `sandbox:state-update` custom event on `document`:

```html
<script>
document.addEventListener('sandbox:state-update', (e) => {
  const { key, value } = e.detail;
  if (key === 'theme') document.body.dataset.theme = value;
  if (key === 'user') document.querySelector('#name').textContent = value.name;
});
</script>
```

## Handling Errors

Subscribe to `onMessage` before calling `render()` to catch runtime errors in AI-generated code.

```ts
sandbox.onMessage((msg) => {
  if (msg.type === 'error') {
    console.error('[sandbox error]', msg.message);
    if (msg.stack) console.debug(msg.stack);
  }
});
```

Both synchronous errors (`window.onerror`) and unhandled promise rejections (`unhandledrejection`) are forwarded as `{ type: 'error' }` messages.

## Injecting Scripts and Styles

Use `SandboxOptions` to inject external scripts and styles into every rendered document.

```ts
const sandbox = createSandbox(container, {
  scripts: [
    'https://cdn.example.com/ore.js',
    'https://cdn.example.com/refine.js',
  ],
  styles: `
    :root { --color-primary: #0066cc; }
    body { margin: 0; font-family: var(--font-sans); }
  `,
});
```

Script URLs are injected before user content. Their origins are automatically added to `script-src` in the CSP — you do not need to configure `buildCsp` separately.

## Configuring CSP

Use `allowedStyleOrigins`, `allowedFontOrigins`, and `allowedImageOrigins` to allow CDN resources.

```ts
const sandbox = createSandbox(container, {
  allowedStyleOrigins: ['https://fonts.googleapis.com'],
  allowedFontOrigins: ['https://fonts.gstatic.com'],
  allowedImageOrigins: ['https://images.example.com'],
});
```

Then render HTML that uses those resources:

```ts
sandbox.render(`
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
  <p style="font-family: Inter, sans-serif">Hello</p>
`);
```

## Disposal

Dispose the sandbox when it is no longer needed. This removes the iframe from the DOM and clears all message listeners.

```ts
// Explicit
sandbox.dispose();

// Using explicit resource management (TypeScript 5.2+)
{
  using sandbox = createSandbox(container);
  sandbox.render('<p>Temporary preview</p>');
} // sandbox.dispose() called automatically
```

## Multiple Listeners

`onMessage` supports multiple independent subscriptions. Each call returns its own unsubscribe function.

```ts
const unsubErrors = sandbox.onMessage((msg) => {
  if (msg.type === 'error') logError(msg);
});

const unsubReady = sandbox.onMessage((msg) => {
  if (msg.type === 'ready') startRendering();
});

// Remove a single subscription
unsubErrors();

// Remove all — dispose() clears all listeners at once
sandbox.dispose();
```

## Receiving Events from the Sandbox

Sandbox code calls `window.__sandbox__.emit(event, detail)` to send events to the host. Receive them via `onMessage` with `msg.type === 'custom'`.

```html
<!-- Inside AI-generated sandbox content -->
<button onclick="window.__sandbox__.emit('button:click', { label: 'Save' })">Save</button>
```

```ts
// Host
sandbox.onMessage((msg) => {
  if (msg.type === 'custom' && msg.event === 'button:click') {
    console.log('Sandbox button clicked:', msg.detail);
  }
});
```

**TypeScript support for sandbox-side code** — add an ambient declaration referencing `SandboxBridge`:

```ts
// sandbox-env.d.ts
declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge;
}
```

## Awaiting Subsequent Renders

`sandbox.ready` resolves only on the first render and does not reset. For workflows where the sandbox is re-rendered, use `nextReady()` to await each subsequent load:

```ts
await sandbox.ready;                    // first render is done
sandbox.render(newHtml);                // start a new render
await sandbox.nextReady();              // wait for the new document to load
```

Multiple callers can call `nextReady()` simultaneously — each receives its own independent `Promise`.

## Cancelling Renders with AbortSignal

Pass an `AbortSignal` to `render()` to skip the render if it has already been cancelled by the time the call executes. Useful in streaming or queued workflows:

```ts
const controller = new AbortController();

async function streamRender(html: string) {
  controller.abort();                   // cancel any previous pending render
  const localController = new AbortController();
  sandbox.render(html, { signal: localController.signal });
}
```

If the signal is already aborted when `render()` is called, the render is skipped with no warning and no DOM change.

## Building Sandbox Documents Directly

To generate a complete sandbox HTML document outside of `createSandbox` (for example in a server context or `@vielzeug/codex`), use `buildDocument`.

```ts
import { buildDocument } from '@vielzeug/sandbox';

const html = buildDocument('<p>Hello</p>', {
  allowedStyleOrigins: ['https://fonts.googleapis.com'],
  allowedFontOrigins: ['https://fonts.gstatic.com'],
});

// html is a complete <!doctype html> document — assign directly to srcdoc
iframe.srcdoc = html;
```

Use `buildCsp` if you only need the CSP string for an existing document template:

```ts
import { buildCsp } from '@vielzeug/sandbox';

const csp = buildCsp({ allowedFontOrigins: ['https://fonts.gstatic.com'] });
// → "default-src 'none'; ... font-src https://fonts.gstatic.com; ..."
```

## Working with Other Vielzeug Libraries

**With Codex:**
The `generate-sandbox-document` and `get-state-bridge-spec` MCP tools in `@vielzeug/codex` are designed to work with Sandbox. They generate complete sandbox-ready document templates and document the bridge protocol for AI context.

```ts
// After codex generates an HTML document for you:
sandbox.render(generatedDocument);
```

**With Refine:**
Inject the Refine/Ore runtime into the sandbox via `scripts`:

```ts
const sandbox = createSandbox(container, {
  scripts: ['https://cdn.example.com/refine.iife.js'],
  styles: '/* refine theme tokens */',
});

// Now AI-generated ore-* components work inside the sandbox
sandbox.render('<ore-card><ore-button>Save</ore-button></ore-card>');
```

## Best Practices

- **Await `ready` before the first render** — `createSandbox()` creates no DOM until `render()` is called. Await `sandbox.ready` to know the first document has loaded.
- **Use `nextReady()` for re-renders** — `sandbox.ready` does not reset on subsequent calls to `render()`. Call `nextReady()` before re-rendering to await the new document.
- **Check `disposed` before deferred calls** — across async operations, check `sandbox.disposed` before calling any method to avoid spurious dev warnings.
- **Call `setState()` after ready** — `setState()` warns in dev if called before the first `render()` (no document yet) or before `ready` fires for the current document (bridge may not be listening). Await `sandbox.ready` or check `sandbox.loaded` first.
- **Treat all messages as untrusted** — sandbox code controls `SandboxMessage` payloads. Do not `eval()` or execute any message field.
- **One sandbox per preview** — `createSandbox()` is a cheap factory; create a new sandbox per user session or component rather than reusing across unrelated renders.
- **Use `using` in functions** — in TypeScript 5.2+ contexts, `using` guarantees cleanup even on exceptions.
- **Prefer state updates over re-renders** — re-render resets all script state. For incremental data pushes, use `setState()` after the initial render.
