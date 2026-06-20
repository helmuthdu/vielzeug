---
title: Sigil — Framework Integration
description: Using Sigil web components with React, Vue 3, Svelte, and Angular.
---

# Framework Integration

[[toc]]

Sigil components are native Web Components — they are HTML elements. You set attributes, listen to DOM events, and project content through slots. Every framework that renders HTML works the same way, with minor wiring differences per framework.

::: tip Before you start
Complete [installation](./index.md#installation) and import the global styles first. This guide covers framework-specific wiring only.
:::

## React

### React 19

React 19 has first-class support for web components. Custom events bind with camelCase props, boolean attributes work without `[attr.*]`, and properties set correctly without a `ref`.

```tsx
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

function ContactForm() {
  const [email, setEmail] = useState('');

  return (
    <form>
      <sg-input
        label="Email"
        type="email"
        value={email}
        onChange={(e: CustomEvent<{ value: string }>) => setEmail(e.detail.value)}
      />
      <sg-button variant="solid" color="primary" type="submit">
        Send
      </sg-button>
    </form>
  );
}
```

### React 18 and Earlier

React 18 does not forward custom events through JSX props. Use a `ref` and `addEventListener` for any event that carries `event.detail`.

```tsx
import { useEffect, useRef } from 'react';
import '@vielzeug/sigil/input';

function SearchBox() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => {
      const value = (e as CustomEvent<{ value: string }>).detail.value;
      console.log('Search:', value);
    };
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, []);

  return <sg-input ref={ref} label="Search" />;
}
```

Native browser events (`click`, `focus`, `blur`) work through JSX props as normal in both React versions.

### TypeScript

Create a global declaration file so TypeScript recognises `sg-*` tags in JSX:

```typescript
// src/custom-elements.d.ts
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'sg-button': React.HTMLAttributes<HTMLElement> & {
        variant?: 'solid' | 'outline' | 'ghost';
        color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
        size?: 'sm' | 'md' | 'lg';
        loading?: boolean;
        disabled?: boolean;
      };
      'sg-input': React.HTMLAttributes<HTMLElement> & {
        label?: string;
        type?: string;
        value?: string;
        required?: boolean;
        disabled?: boolean;
      };
      // extend for each component you use
    }
  }
}
```

### Vite Setup

Tell the React plugin to treat `sg-*` tags as custom elements so it doesn't warn about unknown JSX elements:

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

## Vue 3

Vue 3 supports web components natively. Custom events bind with `@event-name`, attributes bind with `:attr`, and no extra configuration is needed for basic usage.

```vue
<template>
  <sg-input
    label="Email"
    type="email"
    :value="email"
    :disabled="isLoading"
    @change="email = ($event as CustomEvent<{ value: string }>).detail.value"
  />
  <sg-button variant="solid" color="primary" :loading="isLoading" @click="submit">
    Submit
  </sg-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

const email = ref('');
const isLoading = ref(false);

function submit() {
  isLoading.value = true;
}
</script>
```

### Vite Setup

Tell the Vue compiler to treat `sg-*` as custom elements so it skips component resolution for them:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('sg-'),
        },
      },
    }),
  ],
});
```

### Two-Way Binding

`v-model` does not work on web components. Bind `:value` and `@change` explicitly:

```vue
<sg-input
  :value="email"
  @change="email = ($event as CustomEvent<{ value: string }>).detail.value"
  label="Email"
/>
```

## Svelte

Svelte handles web components natively — no configuration needed.

```svelte
<script>
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/input';

  let email = $state('');
</script>

<sg-input
  label="Email"
  value={email}
  onchange={(e) => (email = e.detail.value)}
/>
<sg-button variant="solid" color="primary" onclick={() => console.log(email)}>
  Submit
</sg-button>
```

::: tip Svelte 4
In Svelte 4, use `on:eventname` syntax instead of `oneventname`:
```svelte
<sg-input on:change={(e) => (email = e.detail.value)} label="Email" />
```
:::

## Angular

### Standalone Components (Angular 17+)

Add `CUSTOM_ELEMENTS_SCHEMA` to the component decorator and import the side-effect registrations:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

@Component({
  selector: 'app-contact',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <sg-input
      label="Email"
      [attr.value]="email"
      (change)="email = $event.detail.value">
    </sg-input>
    <sg-button
      variant="solid"
      color="primary"
      [attr.loading]="isLoading || null"
      (click)="submit()">
      Submit
    </sg-button>
  `,
})
export class ContactComponent {
  email = '';
  isLoading = false;

  submit() {
    this.isLoading = true;
  }
}
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

::: tip Boolean attributes
Angular's `[attr.*]` binding sets string values. Pass `null` to remove the attribute entirely:
```html
<sg-button [attr.disabled]="isDisabled || null">Save</sg-button>
```
:::

## SSR

Web Components use browser APIs (`customElements`, `document`, `window`) that do not exist in Node.js. Import Sigil components only on the client.

### Next.js

Use `dynamic` with `ssr: false` to ensure the import never runs on the server:

```tsx
import dynamic from 'next/dynamic';

const MyForm = dynamic(() => import('./MyForm'), { ssr: false });
```

Inside `MyForm`, import Sigil components normally — they will only ever load in the browser.

### Nuxt

Use `<ClientOnly>` to wrap components that depend on Sigil:

```vue
<ClientOnly>
  <sg-button variant="solid" color="primary">Save</sg-button>
</ClientOnly>
```

Import Sigil in a client-side plugin:

```typescript
// plugins/sigil.client.ts
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';
```

### Generic guard

For any other environment:

```typescript
if (typeof window !== 'undefined') {
  import('@vielzeug/sigil/button');
}
```
