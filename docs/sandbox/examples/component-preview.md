---
title: 'Sandbox Examples — Component Preview'
description: Component Preview example for @vielzeug/sandbox.
---

## Component Preview

Render isolated HTML/CSS components with live style hot-patching — no full re-render needed when the stylesheet changes.

### Problem

You're building a component documentation site or design tool. You want to show live component previews in iframes that are isolated from the host page styles, and update the component stylesheet instantly as the user tweaks CSS tokens — without blowing away the component's DOM state.

### Solution

```ts
import { createSandbox } from '@vielzeug/sandbox';

function createComponentPreview(container: HTMLElement, componentCss: string) {
  const sandbox = createSandbox(container, {
    namedStyles: {
      'component-css': componentCss,
    },
  });

  sandbox.onMessage((msg) => {
    if (msg.type === 'resize') {
      const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
      if (iframe) iframe.style.height = `${msg.height}px`;
    }
    if (msg.type === 'error') {
      console.error('[preview]', msg.message);
    }
  });

  return {
    async render(html: string) {
      await sandbox.render(html);
    },
    // Patch CSS live — no re-render, component state preserved
    updateCss(css: string) {
      sandbox.updateStyle('component-css', css);
    },
    [Symbol.dispose]() {
      sandbox.dispose();
    },
  };
}

// Usage
using preview = createComponentPreview(
  document.getElementById('preview')!,
  `body { margin: 0; padding: 1rem; font-family: system-ui; }`,
);

await preview.render('<button class="btn">Click me</button>');

// Later: user changes a token — patch without re-render
preview.updateCss(`
  body { margin: 0; padding: 1rem; font-family: system-ui; }
  .btn { background: oklch(0.6 0.2 260); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; }
`);
```

### How auto-resize works

The bridge script sets up a `ResizeObserver` on `document.body` automatically. When content height changes — on load, after style patches, or after DOM mutations from `setState()` — a `{ type: 'resize', height }` message fires to the host. No manual wiring is needed in the sandbox content.

### Pitfalls

- **`namedStyles` keys must match between `createSandbox` and `updateStyle`** — if the key doesn't exist in the initial `namedStyles`, `updateStyle` still patches the baseline but there is no `<style id>` element in the live document to target.
- **Re-render replaces the document** — `render()` is a full document reset. Prefer `updateStyle()` for CSS-only changes.

### Related

- [Usage Guide — Hot-patching Named Styles](../usage.md#hot-patching-named-styles)
- [Usage Guide — Resize Notifications](../usage.md#resize-notifications)
- [API Reference — SandboxHandle](../api.md#sandboxhandle)
