---
title: 'Formit Examples — Framework Integration'
description: 'Framework Integration examples for formit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Complete examples showing how to integrate Formit with different frameworks using custom hooks/composables for reusability.

::: code-group

```tsx [React Hook]
import { useEffect, useState } from 'react';
import { createForm, type FormOptions } from '@vielzeug/formit';

function useForm(init: FormOptions) {
  const [form] = useState(() => createForm(init));
  const [state, setState] = useState(form.state);

  useEffect(() => form.subscribe(setState), [form]);

  return { form, state };
}

// Usage in component
function LoginForm() {
  const { form, state } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
      password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (values) => {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          return response.json();
        });
      }}>
      <div>
        <input {...form.bind('email')} type="email" placeholder="Email" />
        {state.errors['email'] && <span className="error">{state.errors['email']}</span>}
      </div>

      <div>
        <input {...form.bind('password')} type="password" placeholder="Password" />
        {state.errors['password'] && <span className="error">{state.errors['password']}</span>}
      </div>

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

```typescript [Vue Composable]
// composables/useForm.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { createForm, type FormOptions } from '@vielzeug/formit';

export function useForm(init: FormOptions) {
  const form = createForm(init);
  const state = ref(form.state);
  let unsubscribe;

  onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
  onUnmounted(() => unsubscribe?.());

  return { form, state };
}
```

```vue [Vue Component]
<!-- LoginForm.vue -->
<script setup>
import { useForm } from '@/composables/useForm';

const { form, state } = useForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

const handleSubmit = async () => {
  await form.submit(async (values) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <input v-bind="form.bind('email')" type="email" placeholder="Email" />
      <span v-if="state.errors['email']" class="error">
        {{ state.errors['email'] }}
      </span>
    </div>

    <div>
      <input v-bind="form.bind('password')" type="password" placeholder="Password" />
      <span v-if="state.errors['password']" class="error">
        {{ state.errors['password'] }}
      </span>
    </div>

    <button type="submit" :disabled="state.isSubmitting">
      {{ state.isSubmitting ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
import { createForm } from '@vielzeug/formit';
import { writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';

const form = createForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

const state = writable(form.state);
let unsubscribe;

onMount(() => (unsubscribe = form.subscribe((s) => state.set(s))));
onDestroy(() => unsubscribe?.());

async function handleSubmit() {
  await form.submit(async (values) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    return response.json();
  });
}
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div>
    <input {...form.bind('email')} type="email" placeholder="Email" />
    {#if $state.errors['email']}
      <span class="error">{$state.errors['email']}</span>
    {/if}
  </div>

  <div>
    <input {...form.bind('password')} type="password" placeholder="Password" />
    {#if $state.errors['password']}
      <span class="error">{$state.errors['password']}</span>
    {/if}
  </div>

  <button type="submit" disabled={$state.isSubmitting}>
    {$state.isSubmitting ? 'Logging in...' : 'Login'}
  </button>
</form>
```

:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
