---
title: Craft — Usage Guide
description: Practical Craft usage patterns for components, props, templates, slots, context, forms, controls, observers, and tests.
---

[[toc]]

::: tip New to Craft?
Start with the [Overview](./index.md) for the package surface, then use this page for day-to-day authoring patterns.
:::

## define and component structure

`define(tag, definition)` registers a custom element and returns the tag name.

Your `setup()` function receives prop signals and a typed context bag, then returns a template function.

```ts
import { define, html, signal } from '@vielzeug/craft';

define('status-chip', {
  setup() {
    const online = signal(true);

    return () => html`
      <button @click=${() => (online.value = !online.value)}>${() => (online.value ? 'Online' : 'Offline')}</button>
    `;
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

    return () => html`<div><slot name="items"></slot></div>`;
  },
});
```

For ref-driven DOM work, prefer `onElement()`.

## prop definitions

Define props directly on the component. There is no `defineProps()` helper.

Use `prop.*` helpers for common cases, or raw `PropDef` objects when you need custom parsing or `reflect: false`.

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
    return () => html`
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

    return () => html`
      <label :title=${computed(() => `Current: ${name.value}`)}>Name</label>
      <input
        ref=${inputRef}
        .value=${name}
        :aria-label=${() => `Current name ${name.value}`}
        @input=${(event: Event) => {
          name.value = (event.target as HTMLInputElement).value;
        }} />
      <p>Hello ${name}</p>
    `;
  },
});
```

## directives

`html` supports `each`, `classMap`, `styleMap`, `guard`, `when`, `live`, `until`, and `raw`.

```ts
import { classMap, define, each, html, signal, styleMap, when } from '@vielzeug/craft';

define('task-list', {
  setup() {
    const tasks = signal([{ id: 1, text: 'Write tests' }]);
    const active = signal(true);

    return () => html`
      <ul
        class="${classMap({ ready: () => tasks.value.length > 0 })}"
        :style=${styleMap({ opacity: () => (active.value ? 1 : 0.5) })}>
        ${when(
          () => active.value,
          () => html`<li>Active</li>`,
          () => html`<li>Paused</li>`,
        )}
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
import { define, html, live, signal } from '@vielzeug/craft';

define('live-search', {
  setup() {
    const query = signal('');

    return () =>
      html`<input
        :value=${live(query)}
        @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />`;
  },
});
```

## host bindings

Use setup-context `host` when wiring the custom element itself.

```ts
import { define, html, signal } from '@vielzeug/craft';

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
import { createContext, define, html, injectStrict, provide, signal } from '@vielzeug/craft';

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

Observer helpers from `@vielzeug/craft/observers` should run in `onMounted()`.

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

    return () => html`<div ref=${boxRef}>Observe me</div>`;
  },
});
```

## Framework Integration

Craft components are standard custom elements and work natively in any framework without adapters.

::: code-group

```tsx [React]
// React 19+ supports custom elements natively.
// For earlier versions, use react-to-webcomponent or a thin wrapper.
import '@vielzeug/block'; // or your own craft components

// React 19 — custom element props are passed directly
function App() {
  return (
    <div>
      <x-toggle aria-label="Open menu" />
      <count-provider>
        <count-consumer />
      </count-provider>
    </div>
  );
}
```

```ts [Vue 3]
// Vue 3 resolves custom elements by tag name automatically.
// Mark your tags as custom elements so Vue does not warn about unknown components.
// vite.config.ts: vue({ template: { compilerOptions: { isCustomElement: (t) => t.includes('-') } } })

// In a component:
// <template>
//   <x-toggle :aria-label="label" @click="handleClick" />
//   <count-provider>
//     <count-consumer />
//   </count-provider>
// </template>
```

```svelte [Svelte]
<!-- Svelte supports custom elements out of the box. -->
<script>
  import '@vielzeug/block'; // or your own craft components
  let label = 'Open menu';
</script>

<x-toggle aria-label={label} on:click={handleClick} />
<count-provider>
  <count-consumer />
</count-provider>
```

:::


### Pitfalls

- **React:** Complex object props cannot be passed as JSX attributes — they serialize to `[object Object]`. Use a `ref` and set them imperatively inside `useEffect`.
- **Vue 3:** Without `isCustomElement` in your Vite config, Vue 3 logs "Unknown custom element" warnings for every Craft component. Set it once in `vite.config.ts`.
- **Svelte:** Custom event names emitted via `dispatchEvent()` must match exactly in `on:event-name` — Svelte does not normalize casing.

## Working with Other Vielzeug Libraries

### With Orbit

Use `orbit` to position tooltips and popovers inside a craft component.

```ts
import { define, html, onMounted, ref } from '@vielzeug/craft';
import { computePosition, offset, flip } from '@vielzeug/orbit';

define('x-tooltip', {
  setup() {
    const triggerRef = ref<HTMLElement>();
    const tooltipRef = ref<HTMLElement>();

    onMounted(() => {
      const trigger = triggerRef.value!;
      const tooltip = tooltipRef.value!;
      computePosition(trigger, tooltip, { middleware: [offset(6), flip()] }).then(({ x, y }) => {
        Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px`, position: 'absolute' });
      });
    });

    return () => html`
      <button ref=${triggerRef}>Hover me</button>
      <div ref=${tooltipRef} role="tooltip"><slot></slot></div>
    `;
  },
});
```

### With Forge

Use `forge` for form state and validation inside a craft form component.

```ts
import { define, html } from '@vielzeug/craft';
import { createForm } from '@vielzeug/forge';

define('login-form', {
  setup() {
    const form = createForm({
      defaultValues: { email: '', password: '' },
      validators: {
        email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
      },
    });

    return () => html`
      <form @submit=${async (e: SubmitEvent) => {
        e.preventDefault();
        await form.submit(async (values) => fetch('/api/login', { method: 'POST', body: JSON.stringify(values) }));
      }}>
        <input
          name="email"
          .value=${form.field('email').state.value}
          @input=${(e: Event) => form.set('email', (e.target as HTMLInputElement).value)} />
        <button type="submit">Login</button>
      </form>
    `;
  },
});
```

## Best Practices

- Prefer `onMounted()` for DOM-dependent work and `setup()` for reactive logic.
- Use `effect()` inside `setup()` — not inside `onMounted()` — to keep reactive subscriptions tied to component lifetime.
- Use `onElement(ref, cb)` instead of `onMounted` when the work is tied to a single DOM node.
- Bind host attributes and classes via `host.bind()` rather than mutating the element directly.
- Provide context at the nearest ancestor — avoid global context singletons.
- Call `onCleanup()` for every resource allocated in `setup()` (WebSockets, intervals, event listeners).
- Use `live(signal)` for form inputs to prevent clobbering user-in-progress edits.
- Test with `@vielzeug/craft/testing` helpers (`mount`, `flush`, `waitFor`) rather than direct DOM manipulation.
