## AI UI Renderer

A live preview panel that renders AI-generated HTML, forwards errors to the UI, and pushes state updates without re-rendering.

### Problem

You have an AI code generation pipeline that produces HTML fragments. You want to display them safely in the browser with error reporting, theme injection, and a loading state.

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
    styles: `
      :root { box-sizing: border-box; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; font-family: system-ui, sans-serif; }
    `,
  });

  sandbox.onMessage((msg) => {
    if (msg.type === 'ready') onReady();
    if (msg.type === 'error') onError(msg.message);
  });

  return {
    render(html: string) {
      sandbox.render(html);
    },
    setTheme(theme: 'light' | 'dark') {
      // Push state without re-rendering
      sandbox.setState('theme', theme);
    },
    [Symbol.dispose]() {
      sandbox.dispose();
    },
  };
}

// Usage
using preview = createPreview({
  container: document.getElementById('preview')!,
  onError: (msg) => showError(msg),
  onReady: () => hideSpinner(),
});

// Render AI-generated HTML
preview.render(await generateUI(userPrompt));

// Push updated theme without page reload
preview.setTheme('dark');
```

Inside the AI-generated HTML, listen for theme updates:

```html
<script>
document.addEventListener('sandbox:state-update', (e) => {
  if (e.detail.key === 'theme') {
    document.documentElement.dataset.theme = e.detail.value;
  }
});
</script>
```

### Pitfalls

- **Re-rendering resets state** — every `render()` call is a full document reload. Script state, event listeners, and computed values are lost. Use `setState()` for incremental updates after the initial render.
- **Error strings are untrusted** — `msg.message` and `msg.stack` come from AI-generated code. Display them in the UI, but do not evaluate or pass them to `Function()` or `eval()`.

### Related

- [Usage Guide — Handling Errors](../usage.md#handling-errors)
- [Usage Guide — Passing State](../usage.md#passing-state)
- [Usage Guide — Injecting Scripts and Styles](../usage.md#injecting-scripts-and-styles)
- [API Reference — SandboxHandle](../api.md#sandboxhandle)
