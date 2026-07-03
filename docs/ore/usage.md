---
title: Ore — Usage Guide
description: Practical Ore usage patterns for components, props, templates, slots, context, forms, observers, and tests.
---

[[toc]]

## Basic Usage

`define(tag, definition)` registers a custom element.

Your `setup()` function receives typed prop signals and a context bag, then returns an `HTMLResult` directly.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';

define('status-chip', {
  setup() {
    const online = signal(true);

    return html`
      <button @click=${() => (online.value = !online.value)}>${() => (online.value ? 'Online' : 'Offline')}</button>
    `;
  },
});
```

The setup context bag provides `el`, `aria`, `bind`, `emit`, `slots`, `onMounted`, `onCleanup`, `onEvent`, `onElement`, and `watch`:

```ts
define('my-widget', {
  setup(_props, { el, bind, emit, slots }) {
    // el — the host HTMLElement
    // bind — host binding helper (attr, class, style, on)
    // emit — typed event emitter
    // slots — reactive slot observation
    return html`<slot></slot>`;
  },
});
```

## signals and effects

Ore does not re-export ripple primitives — import them directly from `@vielzeug/ripple`.

```ts
import { batch, computed, effect, signal, watch } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log('doubled =', doubled.value);
});

watch(count, (next, prev) => {
  console.log('count changed', prev, '->', next);
});

batch(() => {
  count.value = 1;
  count.value = 2;
});
```

## onMounted and lifecycle

Use `ctx.onMounted()` for DOM-dependent initialization that must run after the template is mounted. Use `ctx.onElement(ref, cb)` for work tied to a specific DOM node. `ctx.onEvent()` attaches a listener that is automatically removed on disconnect.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html, ref } from '@vielzeug/ore';

define('deferred-init', {
  setup(_props, { slots, onMounted, onElement, onEvent }) {
    const tabIndex = signal(0);
    const inputRef = ref<HTMLInputElement>();

    onMounted(() => {
      const items = slots.elements('items').value;
      console.log('Found', items.length, 'items');
    });

    onElement(inputRef, (input) => {
      input.focus();
    });

    onEvent(window, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') tabIndex.value = 0;
    });

    return html`<div><slot name="items"></slot><input ref=${inputRef} /></div>`;
  },
});
```

## prop definitions

Use `prop.*` helpers for common cases, or raw `PropDef` objects for custom parsing or `reflect: false`.

```ts
import { define, html, prop } from '@vielzeug/ore';

define('x-button', {
  props: {
    label: prop.string('Button'),
    disabled: prop.bool(false),
    variant: prop.oneOf(['primary', 'secondary'] as const, 'primary'),
    count: prop.number(0),
  },
  setup(props) {
    return html`
      <button ?disabled=${props.disabled} :data-variant=${props.variant}>${props.label} (${props.count})</button>
    `;
  },
});
```

## template bindings

`html` supports text, attributes, booleans, properties, events, refs, and nested templates.

```ts
import { computed, signal } from '@vielzeug/ripple';
import { define, html, ref } from '@vielzeug/ore';

define('profile-name', {
  setup() {
    const name = signal('Alice');
    const inputRef = ref<HTMLInputElement>();

    return html`
      <label :title=${computed(() => 'Current: ' + name.value)}>Name</label>
      <input
        ref=${inputRef}
        :value=${name}
        :aria-label=${() => 'Current name ' + name.value}
        @input=${(event: Event) => {
          name.value = (event.target as HTMLInputElement).value;
        }} />
      <p>Hello ${name}</p>
    `;
  },
});
```

## directives

Ore includes `each`, `classMap`, `styleMap`, `when`, `live`, and `raw` — import them from `@vielzeug/ore/directives`.

```ts
import { signal } from '@vielzeug/ripple';
import { classMap, each, styleMap, when } from '@vielzeug/ore/directives';
import { define, html } from '@vielzeug/ore';

define('task-list', {
  setup() {
    const tasks = signal([{ id: 1, text: 'Write tests' }]);
    const active = signal(true);

    return html`
      <ul
        class="${classMap({ ready: () => tasks.value.length > 0 })}"
        :style=${styleMap({ opacity: () => (active.value ? 1 : 0.5) })}>
        ${when(
          () => active.value,
          () => html`<li>Active</li>`,
          () => html`<li>Paused</li>`,
        )}
        ${each(
          tasks,
          (task) => task.id,
          (task) => html`<li>${() => task.value.text}</li>`,
        )}
      </ul>
    `;
  },
});
```

### each() API

`each(source, key, render, fallback?)` takes positional arguments:

- **source** — signal, getter, or plain array
- **key** — function returning a unique key per item
- **render** — receives reactive `item` and `index` signals
- **fallback** — optional, rendered when the list is empty

```ts
each(
  items,
  (item) => item.id,
  (item, index) => html`<li>#${index}: ${() => item.value.label}</li>`,
  () => html`<li>No items</li>`,
);
```

## live form bindings

Use `live(signal)` for inputs that should preserve in-progress user edits instead of overwriting the DOM on stale writes.

```ts
import { signal } from '@vielzeug/ripple';
import { live } from '@vielzeug/ore/directives';
import { define, html } from '@vielzeug/ore';

define('live-search', {
  setup() {
    const query = signal('');

    return html`
      <input :value=${live(query)} @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />
    `;
  },
});
```

## host bindings

The setup context provides `bind` for wiring the host element.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';

define('x-toggle', {
  setup(_props, { bind }) {
    const open = signal(false);

    bind({
      attr: { 'aria-expanded': () => String(open.value), role: 'button', tabindex: 0 },
      class: { 'is-open': open },
      on: { click: () => (open.value = !open.value) },
    });

    return html`<slot></slot>`;
  },
});
```

The `bind` config supports `attr`, `class`, `style`, and `on` sections.

## ARIA bindings

Use `ctx.aria(target, config)` to reactively sync ARIA attributes to any element. Shorthand keys are normalised to `aria-*` automatically — `expanded` becomes `aria-expanded`, `role` is set verbatim.

```ts
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';

define('x-disclosure', {
  setup(_props, { aria, bind, onMounted }) {
    const open = signal(false);
    const panelId = 'disclosure-panel';

    bind({
      attr: { role: 'button', tabindex: 0 },
      on: { click: () => (open.value = !open.value) },
    });

    onMounted(() => {
      const trigger = document.querySelector('#trigger') as HTMLElement;
      if (trigger) {
        // aria() registers cleanup automatically when called inside setup
        aria(trigger, {
          controls: panelId,
          expanded: () => String(open.value),
          haspopup: 'region',
        });
      }
    });

    return html`<slot></slot>`;
  },
});
```

Static values are applied once. Getter functions create reactive effects. Setting a value to `null`, `undefined`, or `false` removes the attribute.

`aria()` always returns a cleanup function. Use it to stop syncing early when a trigger element can be swapped out:

```ts
onMounted(() => {
  const trigger = document.querySelector('#trigger') as HTMLElement;
  const stopAria = aria(trigger, { expanded: () => String(open.value) });

  // Stop syncing when the trigger is replaced
  onCleanup(stopAria);
});
```

### Binding a non-host element with `bind()`

Pass `{ target: el }` as a second argument to bind attributes, classes, styles, or events to any element:

```ts
import { signal } from '@vielzeug/ripple';
import { define, html, ref } from '@vielzeug/ore';

define('button-wrapper', {
  setup(_props, { bind, onMounted }) {
    const visible = signal(false);
    const btnRef = ref<HTMLButtonElement>();

    onMounted(() => {
      const btn = btnRef.value;
      if (!btn) return;

      bind(
        {
          attr: { 'aria-pressed': () => String(visible.value) },
          on: { click: () => (visible.value = !visible.value) },
        },
        { target: btn },
      );
    });

    return html`<button ref=${btnRef}>Toggle</button>`;
  },
});
```

## slots and emits

```ts
import { when } from '@vielzeug/ore/directives';
import { define, html } from '@vielzeug/ore';

define<Record<never, never>, Record<never, never>, 'header' | 'footer'>('card-with-footer', {
  setup(_props, { slots, emit }) {
    return html`
      <div class="card">
        <slot name="header"></slot>
        <slot></slot>
        ${when(slots.has('footer'), () => html`<footer><slot name="footer"></slot></footer>`)}
      </div>
      <button @click=${() => emit('action')}>Go</button>
    `;
  },
});
```

Pass `SlotNames` as a type parameter to `define()` to get typed `slots.has()` and `slots.elements()` calls.

## context provide/inject

```ts
import { signal } from '@vielzeug/ripple';
import { createContext, define, html, injectStrict } from '@vielzeug/ore';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

define('count-provider', {
  setup(_props, { provide }) {
    const count = signal(0);
    provide(COUNT_CTX, count);

    return html`<button @click=${() => count.value++}><slot></slot></button>`;
  },
});

define('count-consumer', {
  setup() {
    const count = injectStrict(COUNT_CTX);

    return html`<p>Count: ${count}</p>`;
  },
});
```

## form-associated elements

```ts
import { signal } from '@vielzeug/ripple';
import { define, html, prop, useField } from '@vielzeug/ore';

define('rating-input', {
  formAssociated: true,
  setup() {
    const value = signal(0);
    const field = useField({ value });

    return html`
      <button @click=${() => (value.value = 1)}>1</button>
      <button @click=${() => (value.value = 2)}>2</button>
      <button @click=${() => (value.value = 3)}>3</button>
      <button @click=${() => field.reportValidity()}>Validate</button>
      <p>Current: ${value}</p>
    `;
  },
});
```

## async setup

When `setup()` returns a `Promise<HTMLResult>`, ore renders `loading()` immediately and swaps in the real template once the promise resolves. Use `onError` to handle failures gracefully.

```ts
import { define, html, prop } from '@vielzeug/ore';

define('user-profile', {
  props: { userId: prop.string('') },
  loading: () => html`<p>Loading…</p>`,
  onError: (_err, el) => html`<p>Failed to load for ${el.getAttribute('user-id')}</p>`,
  async setup(props) {
    const user = await fetch(`/api/users/${props.userId.value}`).then((r) => r.json());

    return html`<p>${user.name}</p>`;
  },
});
```

## platform observers

Observer helpers from `@vielzeug/ore/observers` require real DOM nodes, so call them inside `ctx.onMounted()`.

```ts
import { effect } from '@vielzeug/ripple';
import { define, html, ref } from '@vielzeug/ore';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/ore/observers';

define('x-observed', {
  setup(_props, { onMounted }) {
    const boxRef = ref<HTMLDivElement>();

    onMounted(() => {
      const element = boxRef.value;
      if (!element) return;

      const size = resizeObserver(element);
      const visible = intersectionObserver(element, { threshold: 0.5 });
      const dark = mediaObserver('(prefers-color-scheme: dark)');

      // effect() auto-tracks every signal read inside — re-runs when any of the three change.
      effect(() => {
        console.log(size.value.width, visible.value?.isIntersecting, dark.value);
      });
    });

    return html`<div ref=${boxRef}>Observe me</div>`;
  },
});
```

## testing utilities

Import from `@vielzeug/ore/testing`.

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { signal } from '@vielzeug/ripple';
import { html } from '@vielzeug/ore';
import { cleanup, fire, mount } from '@vielzeug/ore/testing';

describe('my-counter', () => {
  afterEach(cleanup);

  it('increments on click', async () => {
    let count!: ReturnType<typeof signal<number>>;
    const { query, act } = await mount(() => {
      count = signal(0);
      return html`<button @click=${() => count.value++}>${count}</button>`;
    });

    expect(query('button')?.textContent).toBe('0');

    await act(() => fire.click(query('button')!));

    expect(query('button')?.textContent).toBe('1');
  });
});
```

## Framework Integration

Ore components are standard custom elements and work natively in any framework.

::: code-group

```tsx [React]
// React 19+ supports custom elements natively.
import './x-toggle'; // wherever define('x-toggle', { ... }) is called

function App() {
  return <x-toggle aria-label="Open menu" />;
}
```

```ts [Vue 3]
<script setup lang="ts">
import './x-toggle'; // wherever define('x-toggle', { ... }) is called
import { ref } from 'vue';

const open = ref(false);
</script>

<template>
  <x-toggle :aria-label="'Open menu'" @click="open = !open" />
</template>
```

```svelte [Svelte]
<script>
  import './x-toggle'; // wherever define('x-toggle', { ... }) is called

  function handleClick() {
    console.log('toggled');
  }
</script>

<x-toggle aria-label="Open menu" on:click={handleClick} />
```

:::

## Working with Other Vielzeug Libraries

### With Ripple

Import ripple primitives directly from `@vielzeug/ripple` for standalone reactive state outside components.

```ts
import { signal, computed } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';

// Shared state created outside any component
const theme = signal<'light' | 'dark'>('light');
const isDark = computed(() => theme.value === 'dark');

define('theme-toggle', {
  setup() {
    return html`
      <button @click=${() => (theme.value = isDark.value ? 'light' : 'dark')}>
        ${() =>
          isDark.value ? '<ore-icon name="sun" size="16"></ore-icon>' : '<ore-icon name="moon" size="16"></ore-icon>'}
      </button>
    `;
  },
});
```

### With Forge

Use `@vielzeug/forge` for typed form state alongside Ore's `useField()` for form-associated elements.

```ts
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';
import { createFormContext, define, html, FORM_CONTEXT_KEY } from '@vielzeug/ore';

define('signup-form', {
  setup(_props, { provide }) {
    const formCtx = createFormContext({
      onSubmit: async (e) => {
        e?.preventDefault();
        // submit logic
      },
    });

    provide(FORM_CONTEXT_KEY, formCtx);

    return html`
      <form @submit.prevent=${() => formCtx.submit()}>
        <slot></slot>
      </form>
    `;
  },
});
```

## Best Practices

- Setup returns `html\`...\`` directly — not a function wrapping the template.
- Use `ctx.watch()` for reactive subscriptions tied to component lifetime — it auto-registers cleanup on disconnect.
- Use `ctx.onElement(ref, cb)` instead of `ctx.onMounted` when the work is tied to a single DOM node.
- Bind host attributes and classes via `ctx.bind()` rather than mutating the element directly.
- Provide context at the nearest ancestor — avoid global context singletons.
- Call `ctx.onCleanup()` for every resource allocated in `setup()` (WebSockets, intervals, external subscriptions).
- Use `live(signal)` for form inputs to prevent clobbering user-in-progress edits.
- Thread lifecycle hooks explicitly into composable helpers via function parameters — do not rely on implicit module-level context.
- Test with `@vielzeug/ore/testing` helpers (`mount`, `flush`, `waitFor`) rather than direct DOM manipulation.
