---
title: Craftit — Usage Guide
description: Practical usage patterns for Craftit components, directives, and test utilities.
---

# Craftit Usage Guide

::: tip New to Craftit?
Start with the [Overview](./index.md) for installation and a quick intro, then use this guide for day-to-day patterns.
:::

[[toc]]

## defineComponent

`defineComponent({ tag, setup, props?, styles?, formAssociated?, shadow? })` registers a custom element and returns the tag name.

```ts
import { defineComponent, html, signal } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const online = signal(true);

    return html`
      <button @click=${() => (online.value = !online.value)}>${() => (online.value ? 'Online' : 'Offline')}</button>
    `;
  },
  tag: 'status-chip',
});
```

With styles:

```ts
import { css, defineComponent, html } from '@vielzeug/craftit';

defineComponent({
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
  tag: 'x-pill',
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

```ts
import { defineComponent, html, ref, signal } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const name = signal('Alice');
    const inputRef = ref<HTMLInputElement>();

    return html`
      <label :title=${() => `Current: ${name.value}`}>Name</label>
      <input ref=${inputRef} :value=${name} @input=${(e: Event) => (name.value = (e.target as HTMLInputElement).value)} />
      <p>Hello ${name}</p>
    `;
  },
  tag: 'profile-name',
});
```

## Directives Subpath

The `@vielzeug/craftit/directives` subpath contains optional directive helpers.

## `when`

```ts
import { defineComponent, html, signal } from '@vielzeug/craftit';
import { when } from '@vielzeug/craftit/directives';

defineComponent({
  setup() {
    const loggedIn = signal(false);

    return html`
      <button @click=${() => (loggedIn.value = !loggedIn.value)}>Toggle</button>
      ${when(
        loggedIn,
        () => html`<p>Welcome back</p>`,
        () => html`<p>Please sign in</p>`,
      )}
    `;
  },
  tag: 'auth-banner',
});
```

## `each`

```ts
import { defineComponent, html, signal } from '@vielzeug/craftit';
import { each } from '@vielzeug/craftit/directives';

defineComponent({
  setup() {
    const tasks = signal([
      { id: 1, text: 'Write tests', done: false },
      { id: 2, text: 'Ship feature', done: true },
    ]);

    return html`
      <ul>
        ${each(
          tasks,
          (task) => html`<li>${task.text}</li>`,
          () => html`<li>No tasks</li>`,
          { key: (task) => task.id },
        )}
      </ul>
    `;
  },
  tag: 'task-list',
});
```

## `until`

```ts
import { defineComponent, html } from '@vielzeug/craftit';
import { until } from '@vielzeug/craftit/directives';

defineComponent({
  setup() {
    const userPromise = fetch('/api/user').then((r) => r.json() as Promise<{ name: string }>);

    return html`
      ${until(
        userPromise.then((u) => html`<p>Hello ${u.name}</p>`),
        () => html`<p>Loading...</p>`,
        (err) => html`<p>Error: ${String(err)}</p>`,
      )}
    `;
  },
  tag: 'user-greeting',
});
```

## Lifecycle and Runtime Helpers

Use lifecycle helpers from the main entrypoint.

```ts
import { defineComponent, handle, html, onCleanup, onError, onMount, signal } from '@vielzeug/craftit';

defineComponent({
  setup({ host }) {
    const width = signal(window.innerWidth);

    onError((err) => console.error('window-size failed', err));

    onMount(() => {
      handle(window, 'resize', () => {
        width.value = window.innerWidth;
      });

      onCleanup(() => {
        host.toggleAttribute('ready', true);
      });
    });

    return html`<p>Width: ${width}</p>`;
  },
  tag: 'window-size',
});
```

## Props and Attributes

Use top-level `defineComponent({ props })` for grouped props or `prop()` for one-off low-level bindings.

```ts
import { defineComponent, html, typed } from '@vielzeug/craftit';

type Variant = 'primary' | 'secondary';

defineComponent<{ disabled: boolean; label: string; variant: Variant }>({
  props: {
    disabled: { default: false },
    label: { default: 'Button' },
    variant: typed<Variant>('primary'),
  },
  setup({ props }) {
    return html`<button :disabled=${props.disabled} :data-variant=${props.variant}>${props.label}</button>`;
  },
  tag: 'x-button',
});
```

## Slots and Emits

```ts
import { defineComponent, html } from '@vielzeug/craftit';

defineComponent<Record<string, never>, { close: undefined }>({
  setup({ emit, slots }) {
    return html`
      <header>
        <slot name="title"></slot>
        <button @click=${() => emit('close')}>Close</button>
        <small>${() => (slots.has('title').value ? 'Title slot set' : 'No title slot')}</small>
      </header>
    `;
  },
  tag: 'x-modal-header',
});
```

## Context (Provide / Inject)

```ts
import { createContext, defineComponent, html, inject, provide, signal } from '@vielzeug/craftit';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

defineComponent({
  setup() {
    const count = signal(0);

    provide(COUNT_CTX, count);

    return html`<button @click=${() => count.value++}><slot></slot></button>`;
  },
  tag: 'count-provider',
});

defineComponent({
  setup() {
    const count = inject(COUNT_CTX);

    return html`<p>Count: ${() => count?.value ?? 0}</p>`;
  },
  tag: 'count-consumer',
});
```

## Form-Associated Elements

`defineField` requires `defineComponent({ formAssociated: true, ... })`.

```ts
import { defineComponent, defineField, html, signal } from '@vielzeug/craftit';

defineComponent({
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
  tag: 'x-rating',
});
```

## Platform Observers

Observer helpers must run inside an active lifecycle context (typically `onMount`).

```ts
import { defineComponent, effect, html, onMount, observeMedia, observeResize, ref } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const boxRef = ref<HTMLDivElement>();

    onMount(() => {
      const size = observeResize(boxRef.value!);
      const dark = observeMedia('(prefers-color-scheme: dark)');

      effect(() => {
        console.log(size.value.width, size.value.height, dark.value);
      });
    });

    return html`<div ref=${boxRef}>Observe me</div>`;
  },
  tag: 'x-observed',
});
```

## Testing Utilities

Use `@vielzeug/craftit/test` for mount/query/event helpers.

```ts
import { cleanup, mount, user, waitFor } from '@vielzeug/craftit/test';

// In your test runner setup, call cleanup after each test.
// afterEach(() => cleanup());

const fixture = await mount('my-counter');
const button = fixture.query<HTMLButtonElement>('button')!;

await user.click(button);

await waitFor(() => fixture.query('button')?.textContent?.includes('1'));

fixture.destroy();
cleanup();
```
