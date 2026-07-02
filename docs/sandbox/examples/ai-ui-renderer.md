---
title: 'Sandbox Examples — AI UI Renderer'
description: AI UI Renderer example for @vielzeug/sandbox.
---

## AI UI Renderer

A live preview panel that renders AI-generated HTML with streaming updates, error forwarding, and theme injection.

### Problem

You have an AI code generation pipeline that streams HTML fragments. You want to display partial output as it arrives, update the preview live without flicker, and report errors — all without reinitialising the sandbox on every token.

### Solution

```ts
import { createSandbox } from '@vielzeug/sandbox';

interface PreviewOptions {
  container: HTMLElement;
  onError: (message: string) => void;
  onReady: () => void;
}

function createPreview({ container, onError, onReady }: PreviewOptions) {
  const sandbox = createSandbox(container, {
    namedStyles: {
      base: `
        :root { box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; }
        body { margin: 0; font-family: system-ui, sans-serif; }
      `,
    },
  });

  sandbox.onMessage((msg) => {
    if (msg.type === 'error') onError(msg.message);
  });

  // render() sets up the document once — scripts, styles, and listeners are initialized here.
  // patch() streams incremental body updates without reinitialising the page.
  let initialized = false;

  return {
    async initialize() {
      if (initialized) return;
      // Empty body — content arrives via patch()
      await sandbox.render('');
      initialized = true;
      onReady();
    },
    patch(html: string) {
      sandbox.patch(html);
    },
    setTheme(theme: 'light' | 'dark') {
      sandbox.setState('theme', theme);
    },
    [Symbol.dispose]() {
      sandbox.dispose();
    },
  };
}

// Usage — streaming AI output
using preview = createPreview({
  container: document.getElementById('preview')!,
  onError: (msg) => showError(msg),
  onReady: () => hideSpinner(),
});

await preview.initialize();

// Stream tokens as they arrive from the LLM
let accumulated = '';
for await (const chunk of streamUI(userPrompt)) {
  accumulated += chunk;
  preview.patch(accumulated);  // live update, no page reset
}

// Push theme without re-render
preview.setTheme('dark');
```

### How streaming works

1. `initialize()` calls `render('')` once — this sets up the bridge, `namedStyles`, and any injected scripts.
2. Each `patch(html)` call sends `document.body.innerHTML = html` via postMessage. The iframe never navigates — scripts keep running, styles stay applied.
3. The bridge's built-in `ResizeObserver` fires automatically as content grows, so the container can auto-size without additional wiring.

### Pitfalls

- **`patch()` requires `render()` first** — the bridge must be initialized before patches are received. Call `patch()` only after the Promise from `render()` resolves.
- **`patch()` replaces the entire body** — it's `innerHTML`, not an append. If you want to append incrementally, accumulate on the host side (as shown above) and send the full accumulated string each time.
- **Error strings are untrusted** — `msg.message` and `msg.stack` come from AI-generated code. Display them in the UI, but do not evaluate or pass them to `Function()` or `eval()`.
- **`render()` still needed for structural resets** — if the user submits a new prompt and you want a fresh page (clear all script state), call `render('')` again before patching.

### Related

- [Usage Guide — Incremental Updates with patch()](../usage.md#incremental-updates-with-patch)
- [Usage Guide — Handling Errors](../usage.md#handling-errors)
- [Usage Guide — Passing State](../usage.md#passing-state)
- [API Reference — SandboxHandle](../api.md#sandboxhandle)
