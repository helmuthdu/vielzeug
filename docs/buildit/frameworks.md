---
title: Buildit — Framework Integration
description: Using Buildit web components with React, Vue 3, Svelte, and Angular.
---

# Framework Integration

::: tip Getting started?
Make sure you have completed the [Installation](./index.md#installation) step and imported the global styles. This guide shows framework-specific wiring only.
:::

[[toc]]

Buildit is built on native Web Components standards and works in every framework that can render HTML. The components behave like regular HTML elements: set attributes, listen to events, use slots for content projection.

## React

React 18 and earlier do not forward custom events dispatched by web components through JSX props. Use a `ref` and `addEventListener` for `bit-*` events, or use the native DOM `onClick` (which maps to the browser's `click` event) for simple click actions.

### Basic Usage

```tsx
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

function ContactForm() {
  return (
    <form>
      <bit-input label="Email" type="email" required />
      <bit-button variant="solid" color="primary" type="submit">
        Send
      </bit-button>
    </form>
  );
}
```

### Custom Event Handling

Custom events (like `bit-change`) are not forwarded through JSX props. Use a `ref` and `addEventListener`:

```tsx
import { useEffect, useRef } from 'react';
import '@vielzeug/buildit/input';

function SearchBox() {
  const inputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleChange = (e: Event) => {
      const value = (e as CustomEvent<{ value: string }>).detail.value;
      console.log('Search:', value);
    };

    el.addEventListener('bit-change', handleChange);
    return () => el.removeEventListener('bit-change', handleChange);
  }, []);

  return <bit-input ref={inputRef} label="Search" />;
}
```

### TypeScript Support

Register custom elements in a global type declaration so TypeScript recognises them in JSX:

```typescript
// src/custom-elements.d.ts
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'bit-button': React.HTMLAttributes<HTMLElement> & {
        variant?: 'solid' | 'outline' | 'ghost';
        color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
        size?: 'sm' | 'md' | 'lg';
        loading?: boolean;
        disabled?: boolean;
      };
      'bit-input': React.HTMLAttributes<HTMLElement> & {
        label?: string;
        type?: string;
        required?: boolean;
        disabled?: boolean;
      };
      // add more as needed
    }
  }
}
```

### Vite + React Setup

In Vite projects, tell the React plugin to treat `bit-*` tags as custom elements so it doesn't warn about unknown elements:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|tsx)$/,
    }),
  ],
});
```

::: tip React 19+
React 19 added first-class support for web component custom events via JSX props. If you are on React 19, `on-bit-change` style props work without `addEventListener`.
:::

## Vue 3

Vue 3 has excellent native support for Web Components. No extra configuration is needed for basic usage.

### Basic Usage

```vue
<template>
  <bit-input label="Email" type="email" :disabled="isLoading" @bit-change="handleChange" />
  <bit-button variant="solid" color="primary" :loading="isLoading" @click="submit"> Submit </bit-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

const isLoading = ref(false);

function handleChange(e: CustomEvent<{ value: string }>) {
  console.log(e.detail.value);
}

function submit() {
  isLoading.value = true;
}
</script>
```

### Vite + Vue Setup

Tell the Vue compiler to treat `bit-*` tags as custom elements to suppress template warnings:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('bit-'),
        },
      },
    }),
  ],
});
```

### Two-Way Binding

Vue's `v-model` doesn't work directly on web components. Bind `:value` and `@bit-change` manually:

```vue
<bit-input :value="email" @bit-change="email = $event.detail.value" label="Email" />
```

## Svelte

Svelte handles Web Components natively without any extra configuration.

### Basic Usage (Svelte 5)

```svelte
<script>
  import '@vielzeug/buildit/button';
  import '@vielzeug/buildit/input';

  let email = $state('');
</script>

<bit-input
  label="Email"
  value={email}
  onbit-change={(e) => (email = e.detail.value)}
/>
<bit-button variant="solid" color="primary" onclick={() => console.log(email)}>
  Submit
</bit-button>
```

### Svelte 4

```svelte
<script>
  import '@vielzeug/buildit/button';
  let count = 0;
</script>

<bit-button on:click={() => count++}>
  Clicked {count} times
</bit-button>
```

## Angular

### Standalone Components (Angular 17+)

Import `CUSTOM_ELEMENTS_SCHEMA` in the component decorator:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <bit-input label="Email" [attr.value]="email" (bit-change)="onEmailChange($event)"></bit-input>
    <bit-button [attr.loading]="isLoading || null" (click)="submit()">Submit</bit-button>
  `,
})
export class AppComponent {
  email = '';
  isLoading = false;

  onEmailChange(e: CustomEvent<{ value: string }>) {
    this.email = e.detail.value;
  }

  submit() {
    this.isLoading = true;
  }
}
```

Register the side-effect import in your `main.ts` or the component file:

```typescript
// main.ts or component file
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';
```

### NgModule (Angular 14–16)

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

::: tip Boolean attributes in Angular
Angular's `[attr.*]` binding sets attributes as strings. Use `[attr.disabled]="condition || null"` to properly remove boolean attributes when they are false.
:::

## SSR Considerations

Web Components rely on browser APIs (`customElements`, `document`, `window`) and are not available in server-side rendering environments. Wrap component imports in client-side guards:

### Next.js / Nuxt

```ts
// Only import on the client
if (typeof window !== 'undefined') {
  import('@vielzeug/buildit/button');
}
```

In Next.js, prefer dynamic imports with `ssr: false`:

```tsx
import dynamic from 'next/dynamic';

// Ensure the import runs client-side only
const ClientComponent = dynamic(
  () =>
    import('./MyComponent').then((mod) => {
      import('@vielzeug/buildit');
      return mod;
    }),
  { ssr: false },
);
```
