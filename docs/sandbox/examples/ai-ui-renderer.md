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

  // render() sets up the document once — head scripts, styles, and listeners initialize here.
  let initialized = false;

  return {
    async initialize() {
      if (initialized) return;
      // Empty body — streamed content replaces body descendants later
      await sandbox.render('');
      initialized = true;
      onReady();
    },
    replaceBody(html: string) {
      sandbox.replaceBody(html);
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
  preview.replaceBody(accumulated);  // live update, no page reset
}

// Push theme without re-render
preview.setTheme('dark');
```

### How streaming works

1. `initialize()` calls `render('')` once — this sets up the bridge, `namedStyles`, and any injected scripts.
2. Each `replaceBody(html)` call sends `document.body.innerHTML = html` via postMessage. The iframe never navigates; head scripts and styles remain, while body descendants are replaced.
3. The bridge's built-in `ResizeObserver` fires automatically as content grows, so the container can auto-size without additional wiring.

### Pitfalls

- **`replaceBody()` requires `render()` first** — the bridge must initialize before replacement messages are received. Call it only after `render()` resolves.
- **`replaceBody()` replaces the entire body** — it is `innerHTML`, not append. Accumulate markup on the host and send full content each time. Do not retain body element references or expect descendant listeners to survive.
- **Error strings are untrusted** — `msg.message` and `msg.stack` come from AI-generated code. Display them in the UI, but do not evaluate or pass them to `Function()` or `eval()`.
- **`render()` still needed for structural resets** — if a new prompt needs fresh script state, call `render('')` again before replacing body content.

### Related

- [Usage Guide — Incremental Updates with replaceBody()](../usage.md#incremental-updates-with-replacebody)
- [Usage Guide — Handling Errors](../usage.md#handling-errors)
- [Usage Guide — Passing State](../usage.md#passing-state)
- [API Reference — SandboxHandle](../api.md#sandboxhandle)
