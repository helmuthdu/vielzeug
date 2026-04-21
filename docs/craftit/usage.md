---
title: Craftit — Usage Guide
description: Practical usage patterns for Craftit components, directives, and test utilities.
---

# Craftit Usage Guide

::: tip New to Craftit?
Start with the [Overview](./index.md) for installation and a quick intro, then use this guide for day-to-day patterns.
:::

[[toc]]

## define

`define(tag, definition)` registers that definition and returns the tag name.

Registering the same tag twice throws in development mode to catch accidental duplicate definitions early.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('status-chip', {
  setup() {
    const online = signal(true);

    return html`
      <button @click=${() => (online.value = !online.value)}>${() => (online.value ? 'Online' : 'Offline')}</button>
    `;
  },
});
```

With styles:

```ts
import { css, define, html } from '@vielzeug/craftit';

define('x-pill', {
  setup: () => html`<span><slot></slot></span>`,
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

## Template Bindings

`html` supports text, attributes, properties, events, and refs.

Event bindings also support modifiers like `.stop`, `.prevent`, `.self`, `.once`, `.capture`, and `.passive`.

```ts
import { define, html, ref, signal } from '@vielzeug/craftit';

define(
  'profile-name',
  {
    setup() {
      const name = signal('Alice');
      const inputRef = ref<HTMLInputElement>();

      return html`
        <label :title=${() => `Current: ${name.value}`}>Name</label>
        <input
          ref=${inputRef}
          :value=${name}
          @input=${(e: Event) => (name.value = (e.target as HTMLInputElement).value)}
          @keydown.prevent=${(e: KeyboardEvent) => console.log(e.key)}
        />
        <p>Hello ${name}</p>
      `;
    },
  },
);
```

## Template Helpers

## Compact Field Authoring

For form controls, use Craftit controls to avoid repetitive wiring.

```ts
import { define, html, inject, ref } from '@vielzeug/craftit';
import { createTextField } from '@vielzeug/craftit/controls';

define<{ value?: string }>('x-input', {
  props: { value: '' },
  setup({ emit, props }) {
    const formCtx = inject('FORM_CTX');
    const inputRef = ref<HTMLInputElement>();
    const field = createTextField({
      context: formCtx,
      elementRef: inputRef,
      onInput: (event, value) => emit('input', { originalEvent: event, value }),
      prefix: 'x-input',
      value: props.value,
    });

    return html`<input .value=${field.value} ref=${inputRef} />`;
  },
});
```

## Conditional Rendering

```ts
import { define, html, signal } from '@vielzeug/craftit';

define(
  'auth-banner',
  {
    setup() {
      const loggedIn = signal(false);

      return html`
        <button @click=${() => (loggedIn.value = !loggedIn.value)}>Toggle</button>
        ${() => (loggedIn.value ? html`<p>Welcome back</p>` : html`<p>Please sign in</p>`)}
      `;
    },
  },
);
```

## `each`

Reactive `each()` sources (Signal/getter) require an explicit `key` option.

For frequently changing lists, prefer delegated events on a parent node.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define(
  'task-list',
  {
    setup() {
      const tasks = signal([
        { id: 1, text: 'Write tests', done: false },
        { id: 2, text: 'Ship feature', done: true },
      ]);

      return html`
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
      `;
    },
  },
);
```

## Lifecycle and Runtime Helpers

Use lifecycle helpers from the main entrypoint.

For ref-driven effects, host wiring patterns, and cleanup replacement strategies, see [Lifecycle Best Practices](./lifecycle-best-practices.md).

```ts
import {
  define,
  handle,
  html,
  onCleanup,
  onError,
  onMount,
  signal,
} from '@vielzeug/craftit';

define(
  'window-size',
  {
    setup({ host }) {
      const width = signal(window.innerWidth);

      onError((err) => console.error('window-size failed', err));

      onMount(() => {
        handle(window, 'resize', () => {
          width.value = window.innerWidth;
        });

        onCleanup(() => {
          host.el.toggleAttribute('ready', true);
        });
      });

      host.bind({
        attr: {
          'aria-busy': () => String(width.value < 768),
          'aria-label': 'Window size watcher',
          tabindex: 0,
        },
        on: {
          keydown: (e) => {
            if (e.key === 'Enter') host.el.toggleAttribute('active');
          },
        },
      });

      return html`<p>Width: ${width}</p>`;
    },
  },
);
```

`emit(...)` always dispatches `CustomEvent`s, including events without detail.

For manual dispatch, use native DOM events:

```ts
button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
host.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: 'Ada' } }));
```

## Props and Attributes

Use `define<Props>(..., { props })` with plain default values for grouped props.

### Declaring props with `define<Props>`

```ts
import { define, html } from '@vielzeug/craftit';

type ButtonProps = {
  disabled?: boolean;
  label?: string;
  variant?: 'primary' | 'secondary';
};

define(
  'x-button',
  {
    props: {
      label: 'Button',
      disabled: false,
      variant: 'primary',
    },
    setup({ props }) {
      return html`
        <button ?disabled=${props.disabled} :data-variant=${props.variant}>
          ${props.label}
        </button>
      `;
    },
  },
);
```

### Optional props and prop options

Use `undefined` for optional defaults, and a full prop object when you need parsing or reflection options:

```ts
type ButtonProps = {
  count?: number;
  description?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

define(
  'x-button',
  {
    props: {
      description: undefined,
      count: { default: undefined, type: Number },
      required: false,
      size: undefined,
    },
    setup({ props }) {
      return html`
        <button>
          ${props.count.value ? html`<span>${props.count.value}</span>` : null}
        </button>
        ${props.description.value ? html`<small>${props.description.value}</small>` : ''}
      `;
    },
  },
);
```

### Typed emits

Declare event contracts with the second `define<Props, Events>` generic:

```ts
import { define, html } from '@vielzeug/craftit';

type Variant = 'primary' | 'secondary';

type ButtonEvents = {
  change: { variant: Variant };
};

define<{ variant?: Variant }, ButtonEvents>(
  'x-button',
  {
    props: {
      variant: 'primary',
    },
    setup({ emit, props }) {
      return html`
        <button @click=${() => emit('change', { variant: props.variant.value })}>${props.variant.value}</button>
      `;
    },
  },
);
```

## Slots

Use setup-context `slots` to detect slot presence and render fallback UI.

```ts
import { define, html } from '@vielzeug/craftit';

define(
  'x-panel',
  {
    setup({ slots }) {
      return html`
        <header>
          ${() => (slots.has('header').value ? html`<slot name="header"></slot>` : html`<h2>Fallback header</h2>`)}
        </header>
        <section>
          ${() => (slots.has().value ? html`<slot></slot>` : html`<p>No content yet</p>`)}
        </section>
      `;
    },
  },
);
```

## Context (Provide / Inject)

```ts
import { createContext, define, html, inject, provide, signal } from '@vielzeug/craftit';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

define(
  'count-provider',
  {
    setup() {
      const count = signal(0);

      provide(COUNT_CTX, count);

      return html`<button @click=${() => count.value++}><slot></slot></button>`;
    },
  },
);

define(
  'count-consumer',
  {
    setup() {
      const count = inject(COUNT_CTX, signal(0));

      return html`<p>Count: ${count}</p>`;
    },
  },
);
```

## Form-Associated Elements

`defineField` requires `define('tag-name', { formAssociated: true, ... }))`.

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define(
  'x-rating',
  {
    formAssociated: true,
    setup() {
      const value = signal(0);
      const field = defineField({
        value,
        toFormValue: (v) => String(v),
      });

      return html`
        <button @click=${() => (value.value = 1)}>1</button>
        <button @click=${() => (value.value = 2)}>2</button>
        <button @click=${() => (value.value = 3)}>3</button>
        <button @click=${() => field.reportValidity()}>Validate</button>
      `;
    },
  },
);
```

## Platform Observers

Observer helpers must run inside an active lifecycle context (typically `onMount`).

```ts
import { define, effect, html, onMount, ref } from '@vielzeug/craftit';
import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';

define(
  'x-observed',
  {
    setup() {
      const boxRef = ref<HTMLDivElement>();

      onMount(() => {
        const size = resizeObserver(boxRef.value!);
        const dark = mediaObserver('(prefers-color-scheme: dark)');
        const intersection = intersectionObserver(boxRef.value!, { threshold: 0.5 });

        effect(() => {
          console.log(size.value.width, size.value.height, dark.value, intersection.value?.isIntersecting);
        });
      });

      return html`<div ref=${boxRef}>Observe me</div>`;
    },
  },
);
```

## Controls

Use `@vielzeug/craftit/controls` when you need headless interaction logic.

For field-focused guidance and per-control API details, see [Craftit Controls](./controls.md).

- `createListControl` / `createListKeyControl` — keyboard/list focus with rich result metadata.
- `createPressControl` — click/keydown press handler with key filtering and disabled state.
- `createOverlayControl` — reason-aware open/close orchestration.
- `createPopupListControl` — popup list combining overlay + list navigation.
- `createSliderControl` / `createSpinnerControl` — range and numeric spinner control.

```ts
import {
  createListControl,
  createListKeyControl,
  createOverlayControl,
  createPopupListControl,
} from '@vielzeug/craftit/controls';

const nav = createListControl({
  getIndex: () => focusedIndex.value,
  getItems: () => options.value,
  setIndex: (index) => {
    focusedIndex.value = index;
  },
});

const overlay = createOverlayControl({
  getBoundaryElement: () => host,
  isOpen: () => open.value,
  setOpen: (next, context) => {
    open.value = next;
    console.log(context.reason);
  },
});

const moveResult = nav.next();
if (moveResult.reason === 'moved') {
  focusedIndex.value = moveResult.index;
}
overlay.open({ reason: 'trigger' });
```

## Testing Utilities

Use `@vielzeug/craftit/testing` for mount/query/event helpers.

```ts
import { cleanup, mount, user, waitFor } from '@vielzeug/craftit/testing';

// In your test runner setup, call cleanup after each test.
// afterEach(() => cleanup());

const fixture = await mount('my-counter');
const button = fixture.query<HTMLButtonElement>('button')!;

await user.click(button);

await waitFor(() => fixture.query('button')?.textContent?.includes('1'));

fixture.destroy();
cleanup();
```
