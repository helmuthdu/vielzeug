---
title: Sandbox — Usage Guide
description: How to render untrusted HTML, pass state, handle errors, configure CSP, and integrate the sandbox with your application.
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

await sandbox.render('<p>Hello from the sandbox</p>');
```

`render()` returns a `Promise<void>` that resolves when the sandbox document signals it is ready. No DOM is created until `render()` is called — `createSandbox()` is a cheap factory.

For reactive frameworks, subscribe via `onMessage` to receive `error`, `custom`, and `resize` events.

## Rendering HTML

`render(html)` replaces the entire sandboxed document with a new one containing your HTML in the body.

```ts
await sandbox.render(`
  <style>body { font-family: sans-serif; }</style>
  <h1>Component Preview</h1>
  <ore-button variant="primary">Click me</ore-button>
`);
```

Each call to `render()` is a full page reset — scripts reinitialise, CSS is re-applied, and any DOM state is lost. For incremental updates, push state via `setState()` or patch styles via `updateStyle()` rather than re-rendering.

## Incremental Updates with patch()

`patch(html)` replaces `document.body.innerHTML` in the live document without a full page reset. Scripts, event listeners, `namedStyles` CSS blocks, and any injected global state are all preserved.

Use it for streaming AI-generated output, live editor previews, or any scenario where you want to push new content without reinitialising the page.

```ts
// Initial render — sets up the document, scripts, and styles
await sandbox.render(`
  <script>
    document.addEventListener('sandbox:state-update', (e) => {
      document.body.dataset.theme = e.detail.value;
    });
  </script>
  <p>Loading…</p>
`);

// Subsequent updates — body swapped, script listener preserved
sandbox.patch('<p>First chunk arrived</p>');
sandbox.patch('<p>First chunk arrived</p><p>Second chunk…</p>');
sandbox.patch('<p>Complete response</p>');
```

**`patch()` vs `render()`:**

| | `render()` | `patch()` |
|---|---|---|
| Full page reset | Yes | No |
| Returns a Promise | Yes | No |
| Scripts re-run | Yes | No |
| `namedStyles` preserved | Re-injected | Yes |
| State listeners preserved | No (must re-register) | Yes |
| When to use | Initial load, major content change | Streaming, live updates |

**`patch()` must be called after `render()` resolves.** The bridge must be initialized before patches can be received. A dev warning fires if called before the document is ready.

## Passing State

`setState(key, value)` pushes data into the sandbox without re-rendering.

Always call `setState()` after `render()` resolves — calling it before the bridge finishes initializing will silently drop the update in a real browser, and a dev warning will fire.

```ts
// Correct: await render() before pushing state
await sandbox.render('<div id="root"></div>');
sandbox.setState('theme', 'dark');
sandbox.setState('user', { name: 'Alice' });
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

## Batch State Updates

`setStateAll(record)` pushes multiple state values in a single postMessage — one call instead of one `setState()` per key. Use it for initial state setup where several values become available at the same time.

```ts
await sandbox.render('<div id="root"></div>');

// One postMessage instead of two setState() calls
sandbox.setStateAll({
  theme: 'dark',
  user: { name: 'Alice' },
});
```

The sandbox side listens the same way as for `setState()` — each key in the record fires its own `sandbox:state-update` event.

## Handling Errors

Subscribe to `onMessage` before calling `render()` to catch runtime errors in sandbox content.

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
  namedStyles: {
    base: `
      :root { --color-primary: #0066cc; }
      body { margin: 0; font-family: var(--font-sans); }
    `,
  },
});
```

Script URLs are injected before user content. Their origins are automatically added to `script-src` in the CSP — you do not need to configure `buildCsp` separately.

## Setting Document Language and Title

Use `lang` and `title` to set the generated document's `<html lang="…">` attribute and `<title>`. Both improve screen-reader behaviour for sandboxed content.

```ts
const sandbox = createSandbox(container, {
  lang: 'de',
  title: 'Component Preview',
});
```

`lang` defaults to `'en'`, `title` defaults to `''`. Both values are HTML-escaped automatically before being written into the document.

## Hot-patching Named Styles

`namedStyles` injects named `<style id="key">` blocks into the document `<head>`. Named blocks can be updated live without a full re-render using `updateStyle(id, css)`.

```ts
const sandbox = createSandbox(container, {
  namedStyles: {
    theme: ':root { --color-primary: #0066cc; --bg: #fff; }',
  },
});

await sandbox.render('<ore-button variant="primary">Click me</ore-button>');

// Switch theme live — no re-render
sandbox.updateStyle('theme', ':root { --color-primary: #bb33ff; --bg: #111; }');
```

`updateStyle()` sends a postMessage to the iframe, patching `<style id="theme">` in place. It also updates the baseline so the next `render()` starts with the patched CSS. Safe to call before the first render (baseline only — no postMessage sent to an uninitialized iframe).

## Resize Notifications

The bridge script automatically emits `resize` messages via a `ResizeObserver` on `document.body`. No manual wiring is needed in your sandbox content.

```ts
sandbox.onMessage((msg) => {
  if (msg.type === 'resize') {
    container.style.height = `${msg.height}px`;
  }
});
```

The `resize` message fires whenever the `document.body` height changes — on initial load, after content updates via `setState()`, and after style patches via `updateStyle()`.

## Tying Async Work to Sandbox Lifetime

`disposalSignal` is an `AbortSignal` that is aborted when the sandbox is disposed. Pass it to any async operation that should stop when the sandbox is torn down.

```ts
const sandbox = createSandbox(container);

// Polling loop tied to sandbox lifetime
async function poll() {
  while (!sandbox.disposalSignal.aborted) {
    const data = await fetch('/api/data', { signal: sandbox.disposalSignal }).then(r => r.json()).catch(() => null);
    if (data) sandbox.setState('data', data);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

poll();
```

When `sandbox.dispose()` is called, `disposalSignal` aborts, cancelling in-flight fetches and stopping the loop.

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
await sandbox.render(`
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
  <p style="font-family: Inter, sans-serif">Hello</p>
`);
```

Origin values and the `nonce` are sanitized before being written into the policy, and the generated CSP always includes `base-uri 'none'` to block `<base>`-tag injection — you do not need to strip untrusted characters yourself.

## Disposal

Dispose the sandbox when it is no longer needed. This removes the iframe from the DOM and clears all message listeners.

```ts
// Explicit
sandbox.dispose();

// Using explicit resource management (TypeScript 5.2+)
{
  using sandbox = createSandbox(container);
  await sandbox.render('<p>Temporary preview</p>');
} // sandbox.dispose() called automatically
```

## Multiple Listeners

`onMessage` supports multiple independent subscriptions. Each call returns its own unsubscribe function.

```ts
const unsubErrors = sandbox.onMessage((msg) => {
  if (msg.type === 'error') logError(msg);
});

const unsubEvents = sandbox.onMessage((msg) => {
  if (msg.type === 'custom') handleCustomEvent(msg);
});

// Remove a single subscription
unsubErrors();

// Remove all — dispose() clears all listeners at once
sandbox.dispose();
```

## Receiving Events from the Sandbox

Sandbox code calls `window.__sandbox__.emit(event, detail)` to send events to the host. Receive them via `onMessage` with `msg.type === 'custom'`.

```html
<!-- Inside sandbox content -->
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

`render()` returns a `Promise<void>` that resolves when the new document signals ready. Await it directly for each render:

```ts
await sandbox.render(firstHtml);   // first render complete
await sandbox.render(secondHtml);  // second render complete
```

If a second `render()` starts before the first resolves, the first Promise resolves immediately (superseded). Multiple concurrent callers can each await their own returned Promise.

## Cancelling Renders with AbortSignal

Pass an `AbortSignal` to `render()` to skip the render if it has already been cancelled. Useful in streaming or queued workflows:

```ts
let controller = new AbortController();

async function streamRender(html: string) {
  controller.abort();                            // cancel previous pending render
  controller = new AbortController();
  await sandbox.render(html, { signal: controller.signal });
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
  namedStyles: {
    theme: ':root { --bg: #fff; }',
  },
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
The `generate-sandbox-document` and `get-state-bridge-spec` MCP tools in `@vielzeug/codex` are designed to work with Sandbox. They generate complete sandbox-ready document templates and document the bridge protocol.

```ts
// After codex generates an HTML document:
await sandbox.render(generatedDocument);
```

**With Refine:**
Inject the Refine/Ore runtime into the sandbox via `scripts`:

```ts
const sandbox = createSandbox(container, {
  scripts: ['https://cdn.example.com/refine.iife.js'],
  namedStyles: {
    theme: '/* refine theme tokens */',
  },
});

await sandbox.render('<ore-card><ore-button>Save</ore-button></ore-card>');
```

## Best Practices

- **Await `render()` before calling `setState()`/`setStateAll()`** — both warn in dev if called before the bridge is ready. Use `setStateAll()` to bootstrap several values in one postMessage instead of calling `setState()` repeatedly.
- **Use `await sandbox.render(html)` for each render** — `render()` returns a `Promise<void>` that resolves when the document is ready. No separate readiness API is needed.
- **Use `updateStyle()` for theme switching** — patching a named style is faster than a full `render()` and preserves all script and DOM state.
- **Check `disposed` before deferred calls** — across async operations, check `sandbox.disposed` before calling any method to avoid spurious dev warnings.
- **Tie async work to `disposalSignal`** — pass `disposalSignal` to `fetch` and other async operations so they cancel automatically on dispose.
- **Treat all messages as untrusted** — sandbox code controls `SandboxMessage` payloads. Do not `eval()` or execute any message field.
- **One sandbox per preview** — `createSandbox()` is a cheap factory; create a new sandbox per user session or component rather than reusing across unrelated renders.
- **Use `using` in functions** — in TypeScript 5.2+ contexts, `using` guarantees cleanup even on exceptions.
- **Prefer `patch()` or `setState()` over re-renders for incremental updates** — `render()` resets all script state. Use `patch()` to swap body content and `setState()` to push data without losing listeners or CSS state.
