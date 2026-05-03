---
title: Craftit — Lifecycle Best Practices
description: Practical lifecycle patterns for setup, cleanup, refs, and host wiring in Craftit.
---

# Craftit Lifecycle Best Practices

[[toc]]

## Prefer Setup-Scope Reactivity

Most component logic should live directly in `setup()` using signals and `effect()`.

```ts
import { define, effect, html, signal } from '@vielzeug/craftit';

define('counter-title', {
  setup() {
    const count = signal(0);

    effect(() => {
      document.title = `Count: ${count.value}`;
    });

    return () => html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

## Run DOM Initialization with `onMounted()`

Use `onMounted(fn)` for DOM-dependent initialization. Multiple `onMounted()` calls are supported and run in registration order.

```ts
import { define, html, onMounted, ref, signal } from '@vielzeug/craftit';

define('my-tabs', {
  setup(_props, { slots }) {
    const activeTab = signal(0);
    const containerRef = ref<HTMLElement>();

    onMounted(() => {
      const panels = slots.elements('panels').value;
      if (panels.length > 0 && activeTab.value >= panels.length) {
        activeTab.value = 0;
      }
    });

    return () => html`
      <div ref=${containerRef}>
        <div role="tablist"><slot name="tabs"></slot></div>
        <div role="tabpanel"><slot name="panels"></slot></div>
      </div>
    `;
  },
});
```

## Use `onElement()` for Ref-Driven Effects

`onElement(ref, callback)` is ideal for imperative DOM logic tied to a specific referenced element.

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

    return () => html`<input ref=${inputRef} />`;
  },
});
```

## Keep Host Wiring Explicit

Use one-liner host helpers for individual bindings and `host.bind(...)` for grouped bindings.

```ts
import { computed, define, handle, html, signal } from '@vielzeug/craftit';

define('toggle-host', {
  setup(_props, { host }) {
    const open = signal(false);
    const expanded = computed(() => String(open.value));

    host.bind({
      attr: { 'aria-expanded': expanded, role: 'button', tabindex: 0 },
      class: { 'is-open': open },
      on: { click: () => (open.value = !open.value) },
    });

    handle(window, 'keydown', (e) => {
      if (e.key === 'Escape') open.value = false;
    });

    return () => html`<slot></slot>`;
  },
});
```

## Pick the Right Cleanup Primitive

- Use `onCleanup(fn)` for component-owned teardown.
- Use `onElement()` for per-element teardown.
- Return cleanup from `onMounted()` when cleanup belongs to mount-time setup.
