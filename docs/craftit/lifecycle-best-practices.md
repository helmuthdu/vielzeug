---
title: Craftit — Lifecycle Best Practices
description: Practical lifecycle patterns for setup, cleanup, refs, and host wiring in Craftit.
---

# Craftit Lifecycle Best Practices

[[toc]]

## Prefer Setup-Scope Reactivity

Most component logic should live directly in `setup()` using `effect()` and `watch()`.

```ts
import { define, effect, html, signal } from '@vielzeug/craftit';

define('counter-title', {
  setup() {
    const count = signal(0);

    effect(() => {
      document.title = `Count: ${count.value}`;
    });

    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

Use `onMount()` only when you must wait for mount timing (for example platform observers or imperative third-party APIs).

## Use `onElement()` for Ref-Driven Effects

`onElement(ref, callback)` is the cleanest way to react when a `ref` resolves and to auto-clean per element lifecycle.

```ts
import { define, html, onElement, ref } from '@vielzeug/craftit';

define('focus-input', {
  setup() {
    const inputRef = ref<HTMLInputElement>();

    onElement(inputRef, (input) => {
      input.focus();

      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') input.blur();
      };

      input.addEventListener('keydown', onKeydown);

      return () => input.removeEventListener('keydown', onKeydown);
    });

    return html`<input ref=${inputRef} />`;
  },
});
```

## Keep Host Wiring Explicit

Use:

- `host.bind({ attr: ... })`, `host.bind({ class: ... })`, and `host.bind({ on: ... })` for host wiring
- `aria(config)` for ARIA/role host attributes
- `handle(target, event, listener)` for external targets (`window`, `document`, arbitrary elements)

```ts
import { aria, define, handle, html, signal } from '@vielzeug/craftit';

define('toggle-host', {
  setup({ host }) {
    const open = signal(false);

    host.bind('class', () => ({ 'is-open': open.value }));
    host.bind('attr', { tabindex: 0 });
    host.bind('on', {
      click: () => {
        open.value = !open.value;
      },
    });

    aria({
      expanded: () => String(open.value),
      role: 'button',
    });

      onMount(() => {
        handle(window, 'keydown', (e) => {
          if (e.key === 'Escape') open.value = false;
        });
      });

      return html`<slot></slot>`;
    },
  },
);
```

## Pick the Right Cleanup Primitive

- Use `onCleanup(fn)` for one-time teardown owned by the component.
- Use `createCleanupSignal()` when a disposable resource is replaced over time.

```ts
import { createCleanupSignal, define, html, onMount, signal } from '@vielzeug/craftit';

define(
  'search-loader',
  {
    setup() {
      const query = signal('');
      const activeRequest = createCleanupSignal();

      onMount(() => {
        const runSearch = () => {
          const controller = new AbortController();

          activeRequest.set(() => controller.abort());
          fetch(`/api/search?q=${encodeURIComponent(query.value)}`, { signal: controller.signal }).catch(() => {});
        };

        runSearch();
      });

      return html`<div>Searching…</div>`;
    },
  },
);
```

## Error Handling Pattern

Attach `onError()` once in setup to keep failures local to the component.

```ts
import { define, html, onError } from '@vielzeug/craftit';

define(
  'safe-widget',
  {
    setup() {
      onError((err) => {
        console.error('[my-widget]', err);
      });

      return html`<div>Safe widget</div>`;
    },
  },
);
```

## Quick Checklist

- Keep reactive state/effects in setup scope first.
- Use `onElement()` for ref-based imperative logic.
- Keep ARIA in `aria(...)`; keep host class/attrs/listeners in `host.bind(...)`.
- Use `onMount()` only for mount-gated APIs.
- Return/attach cleanups for every listener or disposable resource.
