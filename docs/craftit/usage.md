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

Your `setup()` function receives prop signals and a typed context bag, then returns a component instance with at least `render()`.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('status-chip', {
  setup() {
    const online = signal(true);

    return {
      render: () => html`
        <button @click=${() => (online.value = !online.value)}>
          ${() => (online.value ? 'Online' : 'Offline')}
        </button>
      `,
    };
  },
});
```

Add `styles` and `formAssociated` when the component needs them.

## signals and effects

Craftit re-exports the signal primitives from `@vielzeug/stateit`.

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

Use `effect()` for component-owned reactive work. Use `watch()` when you want explicit previous/next values.

## prop definitions

Define props directly on the component. There is no `defineProps()` helper in the current public API.

```ts
import { define, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: {
    label: prop.string('Button'),
    disabled: prop.bool(false),
    variant: prop.oneOf(['primary', 'secondary'] as const, 'primary'),
    count: prop.number(0),
    internalValue: {
      default: '',
      reflect: false,
      parse: (value) => value ?? '',
    },
  },
  setup(props) {
    return {
      render: () => html`
        <button ?disabled=${props.disabled} :data-variant=${props.variant}>
          ${props.label} (${props.count})
        </button>
      `,
    };
  },
});
```

Use:

- plain values for simple defaults
- `prop.*` helpers for common reflected attribute parsing
- raw `PropDef` objects when you need custom parsing or `reflect: false`

## template bindings

`html` supports text, attributes, booleans, properties, events, refs, and nested `HTMLResult` values.

```ts
import { computed, define, html, ref, signal } from '@vielzeug/craftit';

define('profile-name', {
  setup() {
    const name = signal('Alice');
    const inputRef = ref<HTMLInputElement>();

    return {
      render: () => html`
        <label :title=${computed(() => `Current: ${name.value}`)}>Name</label>
        <input
          ref=${inputRef}
          .value=${name}
          :aria-label=${() => `Current name ${name.value}`}
          @input=${(event: Event) => {
            name.value = (event.target as HTMLInputElement).value;
          }}
          @keydown.stop=${(event: KeyboardEvent) => {
            console.log(event.key);
          }}
        />
        <p>Hello ${name}</p>
      `,
    };
  },
});
```

## directives

Craftit publishes three core directives from the main entry point.

### `each`

```ts
import { define, each, html, signal } from '@vielzeug/craftit';

define('task-list', {
  setup() {
    const tasks = signal([
      { id: 1, text: 'Write tests' },
      { id: 2, text: 'Ship feature' },
    ]);

    return {
      render: () => html`
        <ul>
          ${each(tasks, {
            fallback: () => html`<li>No tasks</li>`,
            key: (task) => task.id,
            render: (task) => html`<li>${task.text}</li>`,
          })}
        </ul>
      `,
    };
  },
});
```

### `classMap`

```ts
import { classMap, define, html, signal } from '@vielzeug/craftit';

define('alert-banner', {
  setup() {
    const danger = signal(false);

    return {
      render: () => html`
        <div class="${classMap({ danger, safe: () => !danger.value })}">Status</div>
      `,
    };
  },
});
```

### `raw`

```ts
import { define, html, raw, signal } from '@vielzeug/craftit';

define('trusted-markup', {
  setup() {
    const content = signal('<strong>Trusted HTML</strong>');

    return {
      render: () => html`<div>${raw(content)}</div>`,
    };
  },
});
```

Use `raw()` only with content you already trust or sanitize.

## host bindings

Use setup-context `host` when wiring the custom element itself.

```ts
import { computed, define, html, signal } from '@vielzeug/craftit';

define('x-toggle', {
  setup(_props, { host }) {
    const open = signal(false);

    host.bind({
      attr: {
        'aria-expanded': computed(() => String(open.value)),
        role: 'button',
        tabindex: 0,
      },
      class: { 'is-open': open },
      on: {
        click: () => {
          open.value = !open.value;
        },
        keydown: (event: KeyboardEvent) => {
          if (event.key === 'Enter') open.value = !open.value;
        },
      },
    });

    return { render: () => html`<slot></slot>` };
  },
});
```

Host binding values may be signals, getter functions, or primitives.

## slots and emits

Use setup-context `slots` to inspect assigned content and setup-context `emit` for typed custom events.

```ts
import { define, html } from '@vielzeug/craftit';

type PanelEvents = {
  close: void;
};

define<Record<string, never>, PanelEvents>('x-panel', {
  setup(_props, { emit, slots }) {
    return {
      render: () => html`
        <header>
          ${() => (slots.has('header').value ? html`<slot name="header"></slot>` : html`<h2>Fallback header</h2>`)}
          <button @click=${() => emit('close')}>Close</button>
        </header>
        <section>
          ${() => (slots.has().value ? html`<slot></slot>` : html`<p>No content yet</p>`)}
        </section>
      `,
    };
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

    return { render: () => html`<button @click=${() => count.value++}><slot></slot></button>` };
  },
});

define('count-consumer', {
  setup() {
    const count = injectStrict(COUNT_CTX);

    return { render: () => html`<p>Count: ${count}</p>` };
  },
});
```

Use `inject(key, fallback)` when the dependency is optional.

## form-associated elements

`defineField()` requires `formAssociated: true` on the component definition.

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define('x-rating', {
  formAssociated: true,
  setup() {
    const value = signal(0);
    const field = defineField({ value, toFormValue: (next) => (next > 0 ? String(next) : null) });

    return {
      render: () => html`
        <button @click=${() => (value.value = 1)}>1</button>
        <button @click=${() => (value.value = 2)}>2</button>
        <button @click=${() => (value.value = 3)}>3</button>
        <button @click=${() => field.setCustomValidity(value.value > 0 ? '' : 'Pick a rating')}>
          Validate
        </button>
      `,
    };
  },
});
```

## platform observers

Observer helpers from `@vielzeug/craftit/observers` must run when the DOM target exists, which usually means inside `mount()`.

```ts
import { define, effect, html, ref } from '@vielzeug/craftit';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

define('x-observed', {
  setup() {
    const boxRef = ref<HTMLDivElement>();

    return {
      mount() {
        const element = boxRef.value;

        if (!element) return;

        const size = resizeObserver(element);
        const visible = intersectionObserver(element, { threshold: 0.5 });
        const dark = mediaObserver('(prefers-color-scheme: dark)');

        effect(() => {
          console.log(size.value.width, visible.value?.isIntersecting, dark.value);
        });
      },
      render: () => html`<div ref=${boxRef}>Observe me</div>`,
    };
  },
});
```

## controls

Use `@vielzeug/craftit/controls` for reusable interaction logic rather than rewriting keyboard, overlay, or field state logic in every component.

```ts
import { createListControl, createOverlayControl, createPressControl } from '@vielzeug/craftit/controls';

const list = createListControl({
  getIndex: () => focusedIndex.value,
  getItems: () => options.value,
  keys: { next: ['ArrowDown'], prev: ['ArrowUp'] },
  loop: true,
  setIndex: (index) => {
    focusedIndex.value = index;
  },
});

const overlay = createOverlayControl({
  getBoundaryElement: () => host.el,
  getPanelElement: () => panelRef.value,
  getTriggerElement: () => triggerRef.value,
  isOpen: () => open.value,
  setOpen: (next, context) => {
    open.value = next;
    console.log(context.reason);
  },
});

const press = createPressControl({
  onPress: () => overlay.toggle(),
});
```

For field-specific helpers and per-control guidance, see [Controls](./controls.md).

## testing utilities

`@vielzeug/craftit/testing` is intended for DOM-capable test runners such as Vitest + jsdom.

```ts
import { cleanup, fire, install, mount, user, waitFor, waitForEvent } from '@vielzeug/craftit/testing';

install(afterEach);

const fixture = await mount('my-counter');
const button = fixture.query<HTMLButtonElement>('button')!;

const changed = waitForEvent<CustomEvent<{ value: number }>>(fixture.element, 'change');

await user.click(button);
fire.keyDown(button, { key: 'Enter' });

await waitFor(() => button.textContent?.includes('1'));
await changed;

cleanup();
```
