---
title: 'Ore: Lifecycle Best Practices'
description: Practical lifecycle patterns for setup, cleanup, refs, and host wiring in Ore.
---

# Ore Lifecycle Best Practices

[[toc]]

## Prefer Setup-Scope Reactivity

Most component logic should live directly in `setup()` using signals and `watchEffect()`.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html, watchEffect } from '@vielzeug/ore';

define('counter-title', {
  setup(_props) {
    const count = signal(0);

    watchEffect(() => {
      document.title = 'Count: ' + count.value;
    });

    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

## Run DOM Initialization with `onMounted()`

Use `onMounted(fn)` for DOM-dependent initialization. Multiple `onMounted()` calls are supported and run in registration order. Each callback is error-isolated.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html, onMounted, ref, useSlots } from '@vielzeug/ore';

define('my-tabs', {
  setup(_props) {
    const activeTab = signal(0);
    const containerRef = ref<HTMLElement>();
    const slots = useSlots<'tabs' | 'panels'>();

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
import { define, html, onElement, ref } from '@vielzeug/ore';

define('focus-input', {
  setup(_props) {
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

Use `bind()` for host bindings.

```ts
import { signal } from '@vielzeug/ripple';
import { bind, define, html, onEvent } from '@vielzeug/ore';

define('toggle-host', {
  setup(_props) {
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

## Moves Are Not Remounts

Teardown runs one microtask after `disconnectedCallback()`, and Ore cancels it when the same element reconnects before
then. A same-turn reparent (`target.appendChild(el)`, an `insertBefore` shuffle) therefore keeps the component's scope
alive: signals, effects, listeners, `adoptedStyleSheets`, the mounted template, and `onMounted()` state all survive the
move untouched, and `setup()` does not re-run.

- Do not treat `connectedCallback`-time work as a per-move reset hook; use props or signals to react to new context.
- Do not write tests that expect `onCleanup` synchronously after `remove()`; await a microtask or `flush()` first.
- A reconnection after the microtask (a genuinely later re-add) is a full remount: fresh `setup()`, fresh mount
  callbacks, and the previous connection already disposed.
