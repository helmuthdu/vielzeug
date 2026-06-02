---
title: Craft — Lifecycle Best Practices
description: Practical lifecycle patterns for setup, cleanup, refs, and host wiring in Craft.
---

# Craft Lifecycle Best Practices

[[toc]]

## Prefer Setup-Scope Reactivity

Most component logic should live directly in `setup()` using signals and `effect()`.

```ts
import { define, effect, html, signal } from '@vielzeug/craft';

define('counter-title', {
  setup() {
    const count = signal(0);

    effect(() => {
      document.title = 'Count: ' + count.value;
    });

    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

## Run DOM Initialization with `onMounted()`

Use `onMounted(fn)` for DOM-dependent initialization. Multiple `onMounted()` calls are supported and run in registration order. Each callback is error-isolated.

```ts
import { define, html, onMounted, ref, signal } from '@vielzeug/craft';

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

    return html`
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
import { define, html, onElement, ref } from '@vielzeug/craft';

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

Use `bind()` from the setup context for host bindings.

```ts
import { computed, define, html, onEvent, signal } from '@vielzeug/craft';

define('toggle-host', {
  setup(_props, { bind }) {
    const open = signal(false);

    bind({
      attr: { 'aria-expanded': () => String(open.value), role: 'button', tabindex: 0 },
      class: { 'is-open': open },
      on: { click: () => (open.value = !open.value) },
    });

    onEvent(window, 'keydown', (e) => {
      if (e.key === 'Escape') open.value = false;
    });

    return html`<slot></slot>`;
  },
});
```

## Pick the Right Cleanup Primitive

- Use `onCleanup(fn)` for component-owned teardown (intervals, WebSockets, subscriptions).
- Use `onElement()` for per-element teardown tied to a specific ref.
- Return a cleanup function from `onMounted()` when cleanup belongs to mount-time initialization.
- Use `onEvent()` for event listeners that should auto-cleanup on disconnect.
