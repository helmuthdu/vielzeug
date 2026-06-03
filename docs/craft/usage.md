---
title: Craft — Usage Guide
description: Practical Craft usage patterns for components, props, templates, slots, context, forms, observers, and tests.
---

[[toc]]

## define and component structure

`define(tag, definition)` registers a custom element and returns the tag name.

Your `setup()` function receives typed prop signals and a context bag, then returns an `HTMLResult` directly.

```ts
import { define, html, signal } from '@vielzeug/craft';

define('status-chip', {
  setup() {
    const online = signal(true);

    return html`
      <button @click=${() => (online.value = !online.value)}>${() => (online.value ? 'Online' : 'Offline')}</button>
    `;
  },
});
```

The setup context bag provides `el`, `bind`, `emit`, and `slots`:

```ts
define('my-widget', {
  setup(_props, { el, bind, emit, slots }) {
    // el — the host HTMLElement
    // bind — host binding helper (attr, class, style, prop, on)
    // emit — typed event emitter
    // slots — reactive slot observation
    return html`<slot></slot>`;
  },
});
```

## signals and effects

Craft re-exports signal primitives from `@vielzeug/ripple`.

```ts
import { batch, computed, effect, signal, watch } from '@vielzeug/craft';

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

Use `onMounted()` for DOM-dependent initialization that must run after the template is mounted.

```ts
import { define, html, onMounted, signal } from '@vielzeug/craft';

define('deferred-init', {
  setup(_props, { slots }) {
    const tabIndex = signal(0);

    onMounted(() => {
      const items = slots.elements('items').value;
      console.log('Found', items.length, 'items', tabIndex.value);
    });

    return html`<div><slot name="items"></slot></div>`;
  },
});
```

For ref-driven DOM work, prefer `onElement()`.

## prop definitions

Use `prop.*` helpers for common cases, or raw `PropDef` objects for custom parsing or `reflect: false`.

```ts
import { define, html, prop } from '@vielzeug/craft';

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
import { computed, define, html, ref, signal } from '@vielzeug/craft';

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

Craft includes `each`, `classMap`, `styleMap`, `when`, `live`, and `raw`.

```ts
import { classMap, define, each, html, signal, styleMap, when } from '@vielzeug/craft';

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
import { define, html, live, signal } from '@vielzeug/craft';

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
import { define, html, signal } from '@vielzeug/craft';

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

The `bind` config supports `attr`, `class`, `style`, `prop`, and `on` sections. You can also call `createBind(el)` directly for advanced use cases outside setup context.

## slots and emits

```ts
import { define, html, when } from '@vielzeug/craft';

define('card-with-footer', {
  slots: ['header', 'footer'] as const,
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

When `slots` is declared as a `const` array, TypeScript narrows `slots.has()` and `slots.elements()` to only accept declared names.

## context provide/inject

```ts
import { createContext, define, html, injectStrict, provide, signal } from '@vielzeug/craft';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

define('count-provider', {
  setup() {
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
import { define, defineField, html, prop, signal } from '@vielzeug/craft';

define('rating-input', {
  formAssociated: true,
  setup() {
    const value = signal(0);
    const field = defineField({ value });

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

When `setup()` returns a `Promise<HTMLResult>`, craft renders `loading()` immediately and swaps in the real template once the promise resolves. Use `onError` to handle failures gracefully.

```ts
import { define, html, prop } from '@vielzeug/craft';

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

Observer helpers from `@vielzeug/craft/observers` require real DOM nodes, so call them in `onMounted()`.

```ts
import { define, effect, html, onMounted, ref } from '@vielzeug/craft';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craft/observers';

define('x-observed', {
  setup() {
    const boxRef = ref<HTMLDivElement>();

    onMounted(() => {
      const element = boxRef.value;
      if (!element) return;

      const size = resizeObserver(element);
      const visible = intersectionObserver(element, { threshold: 0.5 });
      const dark = mediaObserver('(prefers-color-scheme: dark)');

      effect(() => {
        console.log(size.value.width, visible.value?.isIntersecting, dark.value);
      });
    });

    return html`<div ref=${boxRef}>Observe me</div>`;
  },
});
```

## testing utilities

Import from `@vielzeug/craft/testing`.

```ts
import { describe, expect, it } from 'vitest';
import { html, signal } from '@vielzeug/craft';
import { cleanup, fire, flush, mount, waitFor } from '@vielzeug/craft/testing';

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

Craft components are standard custom elements and work natively in any framework.

::: code-group

```tsx [React]
// React 19+ supports custom elements natively.
import '@vielzeug/sigil';

function App() {
  return <x-toggle aria-label="Open menu" />;
}
```

```ts [Vue 3]
<script setup lang="ts">
import '@vielzeug/sigil';
import { ref } from 'vue';

const open = ref(false);
</script>

<template>
  <x-toggle :aria-label="'Open menu'" @click="open = !open" />
</template>
```

```svelte [Svelte]
<script>
  import '@vielzeug/sigil';

  function handleClick() {
    console.log('toggled');
  }
</script>

<x-toggle aria-label="Open menu" on:click={handleClick} />
```

:::

## Working with Other Vielzeug Libraries

### With Ripple

Craft re-exports core ripple primitives, but you can import ripple directly for standalone reactive state outside components.

```ts
import { signal, computed } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/craft';

// Shared state created outside any component
const theme = signal<'light' | 'dark'>('light');
const isDark = computed(() => theme.value === 'dark');

define('theme-toggle', {
  setup() {
    return html`
      <button @click=${() => (theme.value = isDark.value ? 'light' : 'dark')}>
        ${() => (isDark.value ? '☀️' : '🌙')}
      </button>
    `;
  },
});
```

### With Forge

Use `@vielzeug/forge` for typed form state and validation alongside Craft's `defineField()` for form-associated elements.

```ts
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';
import { define, html, provideFormContext } from '@vielzeug/craft';

define('signup-form', {
  setup() {
    const form = createForm({
      defaultValues: { email: '', password: '' },
      validator: s.object({ email: s.string().email(), password: s.string().min(8) }),
    });

    provideFormContext(form);

    return html`
      <form @submit.prevent=${() => form.submit()}>
        <slot></slot>
      </form>
    `;
  },
});
```

## Best Practices

- Setup returns `html\`...\`` directly — not a function wrapping the template.
- Use `effect()` inside `setup()` for reactive subscriptions tied to component lifetime.
- Use `onElement(ref, cb)` instead of `onMounted` when the work is tied to a single DOM node.
- Bind host attributes and classes via `bind()` rather than mutating the element directly.
- Provide context at the nearest ancestor — avoid global context singletons.
- Call `onCleanup()` for every resource allocated in `setup()` (WebSockets, intervals, event listeners).
- Use `live(signal)` for form inputs to prevent clobbering user-in-progress edits.
- Test with `@vielzeug/craft/testing` helpers (`mount`, `flush`, `waitFor`) rather than direct DOM manipulation.
