---
title: Craftit — Lifecycle Best Practices
description: Practical lifecycle patterns for setup, cleanup, refs, and host wiring in Craftit.
---

# Craftit Lifecycle Best Practices

[[toc]]

## Prefer Setup-Scope Reactivity

Most component logic should live directly in `setup()` using `effect()`.

```ts
import { define, effect, html, signal } from '@vielzeug/craftit';

define('counter-title', {
  setup() {
    const count = signal(0);

    effect(() => {
      document.title = `Count: ${count.value}`;
    });

    return { render: () => html`<button @click=${() => count.value++}>${count}</button>` };
  },
});
```

Use `mount()` on the returned `ComponentInstance` only when you must wait for the DOM to be ready (for example platform observers or imperative third-party APIs).

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

    return { render: () => html`<input ref=${inputRef} />` };
  },
});
```

## Keep Host Wiring Explicit

Use:

- `host.attr(name, signal)`, `host.class(map)`, `host.style(map)`, `host.prop(name, descriptor)`, `host.on(event, listener)` — one-liner helpers for individual bindings
- `host.bind({ attr, class, on, prop, style })` — full config object when wiring multiple bindings together
- `handle(target, event, listener)` for external targets (`window`, `document`, arbitrary elements)

Host binding values must be **signals or primitives** — use `computed(...)` for derived reactive values.

```ts
import { computed, define, handle, html, signal } from '@vielzeug/craftit';

define('toggle-host', {
  setup(_props, { host }) {
    const open = signal(false);
    const expanded = computed(() => String(open.value));

    host.bind({
      attr: { 'aria-expanded': expanded, role: 'button', tabindex: 0 },
      class: { 'is-open': open },
      on: { click: () => { open.value = !open.value; } },
    });

    handle(window, 'keydown', (e) => {
      if (e.key === 'Escape') open.value = false;
    });

    return { render: () => html`<slot></slot>` };
  },
});
```

## Pick the Right Cleanup Primitive

- Use `onCleanup(fn)` for one-time teardown owned by the component.
- Use a mutable cleanup variable when a disposable resource is replaced over time.

```ts
import { define, html, onCleanup } from '@vielzeug/craftit';

define('search-loader', {
  setup() {
    const query = signal('');
    let activeRequest: (() => void) | null = null;

    effect(() => {
      const controller = new AbortController();
      activeRequest?.();
      activeRequest = () => controller.abort();
      fetch(`/api/search?q=${encodeURIComponent(query.value)}`, {
        signal: controller.signal,
      }).catch(() => {});
    });

    onCleanup(() => {
      activeRequest?.();
      activeRequest = null;
    });

    return { render: () => html`<div>Searching…</div>` };
  },
});
```

## Quick Checklist

- Keep reactive state/effects in setup scope.
- Use `onElement()` for ref-based imperative DOM logic.
- Host bindings: use signals or primitives; use `computed(...)` for derived values.
- Use one-liner helpers (`host.attr`, `host.class`, etc.) for single bindings; `host.bind(...)` for multi-binding config objects.
- Return/attach cleanups for every listener or disposable resource.
