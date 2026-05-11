---
title: Craftit — Usage Guide
description: Practical Craftit usage patterns for components, props, templates, slots, context, forms, controls, observers, and tests.
---

::: tip New to Craftit?
Start with the [Overview](./index.md) for the package surface, then use this page for day-to-day authoring patterns.
:::

[[toc]]

## define and component structure

`define(tag, definition)` registers a custom element and returns the tag name.

Your `setup()` function receives prop signals and a typed context bag, then returns a template function.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('status-chip', {
  setup() {
    const online = signal(true);

    return () => html`
      <button @click=${() => (online.value = !online.value)}>
        ${() => (online.value ? 'Online' : 'Offline')}
      </button>
    `;
  },
});
```

## signals and effects

Craftit re-exports signal primitives from `@vielzeug/stateit`.

```ts
import { batch, computed, effect, signal, watch } from '@vielzeug/craftit';

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
import { define, html, onMounted, signal } from '@vielzeug/craftit';

define('deferred-init', {
  setup(_props, { slots }) {
    const tabIndex = signal(0);

    onMounted(() => {
      const items = slots.elements('items').value;
      console.log('Found', items.length, 'items', tabIndex.value);
    });

    return () => html`<div><slot name="items"></slot></div>`;
  },
});
```

For ref-driven DOM work, prefer `onElement()`.

## prop definitions

Define props directly on the component. There is no `defineProps()` helper.

Use `prop.*` helpers for common cases, or raw `PropDef` objects when you need custom parsing or `reflect: false`.

```ts
import { define, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: {
    label: prop.string('Button'),
    disabled: prop.bool(false),
    variant: prop.oneOf(['primary', 'secondary'] as const, 'primary'),
    count: prop.number(0),
  },
  setup(props) {
    return () => html`
      <button ?disabled=${props.disabled} :data-variant=${props.variant}>
        ${props.label} (${props.count})
      </button>
    `;
  },
});
```

## template bindings

`html` supports text, attributes, booleans, properties, events, refs, and nested templates.

```ts
import { computed, define, html, ref, signal } from '@vielzeug/craftit';

define('profile-name', {
  setup() {
    const name = signal('Alice');
    const inputRef = ref<HTMLInputElement>();

    return () => html`
      <label :title=${computed(() => `Current: ${name.value}`)}>Name</label>
      <input
        ref=${inputRef}
        .value=${name}
        :aria-label=${() => `Current name ${name.value}`}
        @input=${(event: Event) => {
          name.value = (event.target as HTMLInputElement).value;
        }}
      />
      <p>Hello ${name}</p>
    `;
  },
});
```

## directives

`html` supports `each`, `classMap`, `styleMap`, `guard`, `when`, `live`, `until`, and `raw`.

```ts
import { classMap, define, each, html, signal, styleMap, when } from '@vielzeug/craftit';

define('task-list', {
  setup() {
    const tasks = signal([{ id: 1, text: 'Write tests' }]);
    const active = signal(true);

    return () => html`
      <ul
        class="${classMap({ ready: () => tasks.value.length > 0 })}"
        :style=${styleMap({ opacity: () => (active.value ? 1 : 0.5) })}
      >
        ${when(() => active.value, () => html`<li>Active</li>`, () => html`<li>Paused</li>`)}
        ${each(tasks, {
          key: (task) => task.id,
          render: (task) => html`<li>${task.text}</li>`,
        })}
      </ul>
    `;
  },
});
```

## live form bindings

Use `live(signal)` for inputs that should preserve in-progress user edits instead of overwriting the DOM on stale writes.

```ts
import { define, html, live, signal } from '@vielzeug/craftit';

define('live-search', {
  setup() {
    const query = signal('');

    return () => html`<input :value=${live(query)} @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />`;
  },
});
```

## host bindings

Use setup-context `host` when wiring the custom element itself.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('x-toggle', {
  setup(_props, { host }) {
    const open = signal(false);

    host.bind({
      attr: { 'aria-expanded': () => String(open.value), role: 'button', tabindex: 0 },
      class: { 'is-open': open },
      on: { click: () => (open.value = !open.value) },
    });

    return () => html`<slot></slot>`;
  },
});
```

## context provide/inject

```ts
import { createContext, define, html, injectStrict, provide, signal } from '@vielzeug/craftit';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

define('count-provider', {
  setup() {
    const count = signal(0);
    provide(COUNT_CTX, count);

    return () => html`<button @click=${() => count.value++}><slot></slot></button>`;
  },
});

define('count-consumer', {
  setup() {
    const count = injectStrict(COUNT_CTX);

    return () => html`<p>Count: ${count}</p>`;
  },
});
```

## platform observers

Observer helpers from `@vielzeug/craftit/observers` should run in `onMounted()`.

```ts
import { define, effect, html, onMounted, ref } from '@vielzeug/craftit';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

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

    return () => html`<div ref=${boxRef}>Observe me</div>`;
  },
});
```
