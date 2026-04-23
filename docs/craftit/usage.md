---
title: Craftit — Usage Guide
description: Practical usage patterns for Craftit components, directives, and test utilities.
---

::: tip New to Craftit?
Start with the [Overview](./index.md) for installation and a quick intro, then use this guide for day-to-day patterns.
:::

[[toc]]

## define

`define(tag, definition)` registers that definition and returns the tag name.

Registering the same tag twice throws to catch accidental duplicate definitions early.

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

With styles:

```ts
import { css, define, html } from '@vielzeug/craftit';

define('x-pill', {
  setup: () => ({ render: () => html`<span><slot></slot></span>` }),
  styles: [
    css`
      span {
        border: 1px solid currentColor;
        border-radius: 999px;
        padding: 0.125rem 0.5rem;
      }
    `,
  ],
});
```

## Signals and State

Craftit re-exports all of `@vielzeug/stateit`, so these work directly:

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

`watch` is re-exported from `@vielzeug/stateit`. Use it anywhere; it is not tied to component lifecycle.

## Template Bindings

`html` supports text, attributes, events, and refs.

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
          :value=${name}
          @input=${(e: Event) => (name.value = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => console.log(e.key)}
        />
        <p>Hello ${name}</p>
      `,
    };
  },
});
```

## Compact Field Authoring

For form controls, use Craftit controls to avoid repetitive wiring.

```ts
import { define, html, inject, ref } from '@vielzeug/craftit';
import { createTextField } from '@vielzeug/craftit/controls';

define<{ value?: string }>('x-input', {
  props: { value: '' },
  setup(props, { emit }) {
    const formCtx = inject('FORM_CTX');
    const inputRef = ref<HTMLInputElement>();
    const field = createTextField({
      context: formCtx,
      elementRef: inputRef,
      onInput: (event, value) => emit('input', { originalEvent: event, value }),
      prefix: 'x-input',
      value: props.value,
    });

    return { render: () => html`<input :value=${field.value} ref=${inputRef} />` };
  },
});
```

## Conditional Rendering

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('auth-banner', {
  setup() {
    const loggedIn = signal(false);

    return {
      render: () => html`
        <button @click=${() => (loggedIn.value = !loggedIn.value)}>Toggle</button>
        ${() => (loggedIn.value ? html`<p>Welcome back</p>` : html`<p>Please sign in</p>`)}
      `,
    };
  },
});
```

## `each`

Reactive `each()` sources require an explicit `key` option. For frequently changing lists, prefer delegated events on a parent node.

```ts
import { define, each, html, signal } from '@vielzeug/craftit';

define('task-list', {
  setup() {
    const tasks = signal([
      { id: 1, text: 'Write tests', done: false },
      { id: 2, text: 'Ship feature', done: true },
    ]);

    return {
      render: () => html`
        <ul @click=${(e: Event) => {
          const target = (e.target as HTMLElement).closest<HTMLElement>('[data-task-id]');
          if (!target) return;
          console.log('clicked task', target.dataset.taskId);
        }}>
          ${each(tasks, {
            fallback: () => html`<li>No tasks</li>`,
            key: (task) => task.id,
            render: (task) => html`<li data-task-id=${task.id}>${task.text}</li>`,
          })}
        </ul>
      `,
    };
  },
});
```

## Lifecycle and Runtime Helpers

Use lifecycle helpers from the main entrypoint.

For ref-driven effects, host wiring patterns, and cleanup strategies, see [Lifecycle Best Practices](./lifecycle-best-practices.md).

`onCleanup()` is component-scoped: inside a component runtime it is tied to host disconnect.

```ts
import { define, handle, html, onCleanup, signal } from '@vielzeug/craftit';

define('window-size', {
  setup(_props, { host }) {
    const width = signal(window.innerWidth);
    const ariaLabel = 'Window size watcher';
    const ariaBusy = computed(() => String(width.value < 768));

    host.bind({
      attr: { 'aria-busy': ariaBusy, 'aria-label': ariaLabel, tabindex: 0 },
      on: {
        keydown: (e) => {
          if ((e as KeyboardEvent).key === 'Enter') host.el.toggleAttribute('active');
        },
      },
    });

    handle(window, 'resize', () => {
      width.value = window.innerWidth;
    });

    onCleanup(() => {
      host.el.removeAttribute('active');
    });

    return { render: () => html`<p>Width: ${width}</p>` };
  },
});
```

## Props and Attributes

Use `defineProps` + `prop.*` helpers for concise, fully typed prop definitions.

### Declaring props with `defineProps` + `prop.*`

```ts
import { computed, define, defineProps, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: defineProps({
    label: prop.string('Button'),
    disabled: prop.bool(false),
    variant: prop.oneOf(['primary', 'secondary'] as const, 'primary'),
    count: prop.number(0),
  }),
  setup(props, { host }) {
    host.attr('disabled', props.disabled);

    return {
      render: () => html`
        <button ?disabled=${props.disabled} :data-variant=${props.variant}>
          ${props.label}
        </button>
      `,
    };
  },
});
```

### Custom parsing and reflection control

When you need finer control use a raw `PropDef` object:

```ts
define<{ openState?: boolean | undefined }>('x-drawer', {
  props: {
    openState: {
      default: undefined as boolean | undefined,
      parse: (v) => (v == null ? undefined : v === '' || v === 'true'),
      reflect: false,
    },
  },
  setup(props) {
    return { render: () => html`<slot></slot>` };
  },
});
```

### Typed emits

Declare event contracts with the second `define<Props, Events>` generic:

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

type ButtonEvents = {
  change: { variant: 'primary' | 'secondary' };
};

define<Record<string, never>, ButtonEvents>('x-button', {
  props: defineProps({
    variant: prop.oneOf(['primary', 'secondary'] as const, 'primary'),
  }),
  setup(props, { emit }) {
    return {
      render: () => html`
        <button @click=${() => emit('change', { variant: props.variant.value })}>
          ${props.variant.value}
        </button>
      `,
    };
  },
});
```

## Host Bindings

Host binding values must be **signals or primitives**. Use `computed(...)` for reactive derived values.

```ts
import { computed, define, html, signal } from '@vielzeug/craftit';

define('x-toggle', {
  setup(_props, { host }) {
    const open = signal(false);
    const expanded = computed(() => String(open.value));

    host.attr('aria-expanded', expanded);
    host.attr('role', 'button');
    host.class({ 'is-open': open });
    host.on('click', () => { open.value = !open.value; });

    return { render: () => html`<slot></slot>` };
  },
});
```

## Slots

Use setup-context `slots` to detect slot presence and render fallback UI.

```ts
import { define, html } from '@vielzeug/craftit';

define('x-panel', {
  setup(_props, { slots }) {
    return {
      render: () => html`
        <header>
          ${() => (slots.has('header').value ? html`<slot name="header"></slot>` : html`<h2>Fallback header</h2>`)}
        </header>
        <section>
          ${() => (slots.has().value ? html`<slot></slot>` : html`<p>No content yet</p>`)}
        </section>
      `,
    };
  },
});
```

## Context (Provide / Inject)

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

## Form-Associated Elements

`defineField` requires `define('tag-name', { formAssociated: true, ... })`.

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define('x-rating', {
  formAssociated: true,
  setup() {
    const value = signal(0);

    defineField({ value });

    return {
      render: () => html`
        <button @click=${() => (value.value = 1)}>1</button>
        <button @click=${() => (value.value = 2)}>2</button>
        <button @click=${() => (value.value = 3)}>3</button>
      `,
    };
  },
});
```

`toFormValue` defaults to `String(v)` for primitives and `null` for `null`/`undefined`. Override it for custom serialisation:

```ts
defineField({ value, toFormValue: (v) => JSON.stringify(v) });
```

## Platform Observers

```ts
import { define, effect, html, ref } from '@vielzeug/craftit';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

define('x-observed', {
  setup() {
    const boxRef = ref<HTMLDivElement>();

    return {
      mount() {
        const size = resizeObserver(boxRef.value!);
        const dark = mediaObserver('(prefers-color-scheme: dark)');
        const visible = intersectionObserver(boxRef.value!, { threshold: 0.5 });

        effect(() => {
          console.log(size.value.width, dark.value, visible.value?.isIntersecting);
        });
      },
      render: () => html`<div ref=${boxRef}>Observe me</div>`,
    };
  },
});
```

## Controls

Use `@vielzeug/craftit/controls` when you need headless interaction logic.

For field-focused guidance and per-control API details, see [Craftit Controls](./controls.md).

```ts
import { createListControl, createOverlayControl } from '@vielzeug/craftit/controls';

const nav = createListControl({
  getIndex: () => focusedIndex.value,
  getItems: () => options.value,
  setIndex: (index) => { focusedIndex.value = index; },
});

const overlay = createOverlayControl({
  getBoundaryElement: () => host,
  isOpen: () => open.value,
  setOpen: (next, context) => { open.value = next; console.log(context.reason); },
});

const moveResult = nav.next();
if (moveResult.reason === 'moved') focusedIndex.value = moveResult.index;
overlay.open({ reason: 'trigger' });
```

## Testing Utilities

```ts
import { cleanup, mount, user, waitFor } from '@vielzeug/craftit/testing';

// afterEach(() => cleanup());

const fixture = await mount('my-counter');
const button = fixture.query<HTMLButtonElement>('button')!;

await user.click(button);
await waitFor(() => fixture.query('button')?.textContent?.includes('1'));

fixture.destroy();
cleanup();
```
