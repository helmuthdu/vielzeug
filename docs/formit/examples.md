# Formit Examples

Real-world examples demonstrating common use cases and patterns with Formit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, one-off forms
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Formit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a form instance within components.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

function App() {
  const [form] = useState(() =>
    createForm({
      initialValues: { email: '' },
      fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <input {...form.bind('email')} placeholder="Email" />
      {state.errors.email && <span>{state.errors.email}</span>}
      <button type="submit" disabled={state.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { email: '' },
  fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('email')" placeholder="Email" />
    <span v-if="state.errors.email">{{ state.errors.email }}</span>
    <button type="submit" :disabled="state.isSubmitting">Submit</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { email: '' },
    fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('email')} placeholder="Email" />
  {#if state.errors.email}<span>{state.errors.email}</span>{/if}
  <button type="submit" disabled={state.isSubmitting}>Submit</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class SimpleForm extends HTMLElement {
  #form = createForm({
    initialValues: { email: '' },
    fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } },
  });
  #unsubscribe;

  connectedCallback() {
    this.innerHTML = `
      <form>
        <input name="email" placeholder="Email">
        <span id="error" style="color: red;"></span>
        <button type="submit">Submit</button>
      </form>
    `;
    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };
    this.querySelector('input').oninput = (e) => this.#form.setValue('email', e.target.value);

    this.#unsubscribe = this.#form.subscribe((state) => {
      this.querySelector('#error').textContent = state.errors.email || '';
      this.querySelector('button').disabled = state.isSubmitting;
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('simple-form', SimpleForm);
```

:::

### Advanced Integration (Hook/Composable)

Recommended pattern for reusability and separation of concerns.

::: code-group

```tsx [React]
// useForm.ts
import { createForm } from '@vielzeug/formit';
import { useEffect, useState, useMemo } from 'react';

export function useForm(init) {
  const form = useMemo(() => createForm(init), []);
  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);
  return { form, state };
}

// Component.tsx
function LoginForm() {
  const { form, state } = useForm({
    initialValues: { email: '' },
    fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <input {...form.bind('email')} placeholder="Email" />
      <button type="submit" disabled={state.isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

```vue [Vue 3]
// useForm.ts import { createForm } from '@vielzeug/formit'; import { ref, onMounted, onUnmounted } from 'vue'; export
function useForm(init) { const form = createForm(init); const state = ref(form.getStateSnapshot()); let unsubscribe;
onMounted(() => unsubscribe = form.subscribe(s => state.value = s)); onUnmounted(() => unsubscribe?.()); return { form,
state }; } // Component.vue
<script setup>
const { form, state } = useForm({
  initialValues: { email: '' },
  fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } },
});
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('email')" />
    <button type="submit" :disabled="state.isSubmitting">Submit</button>
  </form>
</template>
```

```svelte [Svelte]
// formStore.ts
import { createForm } from '@vielzeug/formit';
import { writable } from 'svelte/store';

export function useForm(init) {
  const form = createForm(init);
  const state = writable(form.getStateSnapshot());
  const unsubscribe = form.subscribe(s => state.set(s));
  return { form, state, unsubscribe };
}

// Component.svelte
<script>
  import { useForm } from './formStore';
  import { onDestroy } from 'svelte';

  const { form, state, unsubscribe } = useForm({
    initialValues: { email: '' },
    fields: { email: { validators: (v) => !v.includes('@') && 'Invalid email' } }
  });
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('email')} />
  <button type="submit" disabled={$state.isSubmitting}>Submit</button>
</form>
```

```ts [Web Component]
// BaseForm.ts
import { createForm } from '@vielzeug/formit';

export class BaseForm extends HTMLElement {
  form;
  #unsubscribe;

  init(config) {
    this.form = createForm(config);
    this.#unsubscribe = this.form.subscribe((state) => this.render(state));
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }

  render(state) {
    /* override */
  }
}
```

:::

<style>
  .error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 0.25rem;
  }

  .alert-success {
    background-color: #d4edda;
    color: #155724;
  }

  .alert-error {
    background-color: #f8d7da;
    color: #721c24;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    background-color: var(--vp-c-bg);
    color: var(--vp-c-text-1);
  }

  .btn, .submit-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    background-color: var(--vp-c-brand);
    color: white;
    font-weight: 600;
  }

  .btn:disabled, .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }
</style>

## Registration Form

Complete registration form with validation, error handling, and submission.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function RegistrationForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { username: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
      fields: {
        username: {
          validators: [
            (v) => !v && 'Username is required',
            async (v) => {
              const res = await fetch(`/api/check-username?username=${v}`);
              const { exists } = await res.json();
              if (exists) return 'Taken';
            },
          ],
        },
        email: { validators: (v) => !v.includes('@') && 'Invalid email' },
        password: { validators: (v) => v.length < 8 && 'Too short' },
        acceptTerms: { validators: (v) => !v && 'Required' },
      },
      validate: (values) => {
        if (values.password !== values.confirmPassword) {
          return { confirmPassword: 'Passwords do not match' };
        }
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <div className="form-group">
        <label>Username</label>
        <input {...form.bind('username')} onBlur={() => form.validateField('username')} />
        {state.errors.username && <span className="error">{state.errors.username}</span>}
      </div>
      <div className="form-group">
        <label>Email</label>
        <input {...form.bind('email')} />
        {state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" {...form.bind('password')} />
        {state.errors.password && <span className="error">{state.errors.password}</span>}
      </div>
      <div className="form-group">
        <label>Confirm Password</label>
        <input type="password" {...form.bind('confirmPassword')} />
        {state.errors.confirmPassword && <span className="error">{state.errors.confirmPassword}</span>}
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={state.values.acceptTerms}
            onChange={(e) => form.setValue('acceptTerms', e.target.checked)}
          />
          Accept Terms
        </label>
        {state.errors.acceptTerms && <span className="error">{state.errors.acceptTerms}</span>}
      </div>
      <button type="submit" disabled={state.isSubmitting}>
        Register
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { username: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  fields: {
    username: {
      validators: [
        (v) => !v && 'Username is required',
        async (v) => {
          /* async check */
        },
      ],
    },
    email: { validators: (v) => !v.includes('@') && 'Invalid email' },
    password: { validators: (v) => v.length < 8 && 'Too short' },
    acceptTerms: { validators: (v) => !v && 'Required' },
  },
  validate: (values) => {
    if (values.password !== values.confirmPassword) {
      return { confirmPassword: 'Passwords do not match' };
    }
  },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <div class="form-group">
      <label>Username</label>
      <input v-bind="form.bind('username')" @blur="form.validateField('username')" />
      <span v-if="state.errors.username" class="error">{{ state.errors.username }}</span>
    </div>
    <div class="form-group">
      <label>Email</label>
      <input v-bind="form.bind('email')" />
      <span v-if="state.errors.email" class="error">{{ state.errors.email }}</span>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" v-bind="form.bind('password')" />
      <span v-if="state.errors.password" class="error">{{ state.errors.password }}</span>
    </div>
    <div class="form-group">
      <label>Confirm Password</label>
      <input type="password" v-bind="form.bind('confirmPassword')" />
      <span v-if="state.errors.confirmPassword" class="error">{{ state.errors.confirmPassword }}</span>
    </div>
    <div class="form-group">
      <label>
        <input
          type="checkbox"
          :checked="state.values.acceptTerms"
          @change="(e) => form.setValue('acceptTerms', e.target.checked)" />
        Accept Terms
      </label>
      <span v-if="state.errors.acceptTerms" class="error">{{ state.errors.acceptTerms }}</span>
    </div>
    <button type="submit" :disabled="state.isSubmitting">Register</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { username: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
    fields: {
      username: {
        validators: [
          (v) => !v && 'Username is required',
          async (v) => { /* async check */ }
        ]
      },
      email: { validators: (v) => !v.includes('@') && 'Invalid email' },
      password: { validators: (v) => v.length < 8 && 'Too short' },
      acceptTerms: { validators: (v) => !v && 'Required' }
    },
    validate: (values) => {
      if (values.password !== values.confirmPassword) {
        return { confirmPassword: 'Passwords do not match' };
      }
    }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <div class="form-group">
    <label>Username</label>
    <input {...form.bind('username')} on:blur={() => form.validateField('username')} />
    {#if state.errors.username}<span class="error">{state.errors.username}</span>{/if}
  </div>
  <div class="form-group">
    <label>Email</label>
    <input {...form.bind('email')} />
    {#if state.errors.email}<span class="error">{state.errors.email}</span>{/if}
  </div>
  <div class="form-group">
    <label>Password</label>
    <input type="password" {...form.bind('password')} />
    {#if state.errors.password}<span class="error">{state.errors.password}</span>{/if}
  </div>
  <div class="form-group">
    <label>Confirm Password</label>
    <input type="password" {...form.bind('confirmPassword')} />
    {#if state.errors.confirmPassword}<span class="error">{state.errors.confirmPassword}</span>{/if}
  </div>
  <div class="form-group">
    <label>
      <input type="checkbox" checked={state.values.acceptTerms} on:change={(e) => form.setValue('acceptTerms', e.target.checked)} />
      Accept Terms
    </label>
    {#if state.errors.acceptTerms}<span class="error">{state.errors.acceptTerms}</span>{/if}
  </div>
  <button type="submit" disabled={state.isSubmitting}>Register</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class RegistrationForm extends HTMLElement {
  #form = createForm({
    initialValues: { username: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
    fields: {
      username: { validators: [(v) => !v && 'Required'] },
      email: { validators: (v) => !v.includes('@') && 'Invalid' },
      password: { validators: (v) => v.length < 8 && 'Too short' },
      acceptTerms: { validators: (v) => !v && 'Required' },
    },
  });
  #unsubscribe;

  connectedCallback() {
    this.innerHTML = `
      <form>
        <div class="form-group">
          <label>Username</label>
          <input name="username">
          <span id="username-error" class="error"></span>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input name="email">
          <span id="email-error" class="error"></span>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password">
          <span id="password-error" class="error"></span>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="acceptTerms"> Accept Terms</label>
          <span id="terms-error" class="error"></span>
        </div>
        <button type="submit">Register</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    const inputs = this.querySelectorAll('input');
    inputs.forEach((input) => {
      input.oninput = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        this.#form.setValue(input.name, value);
      };
    });

    this.#unsubscribe = this.#form.subscribe((state) => {
      this.querySelector('#username-error').textContent = state.errors.username || '';
      this.querySelector('#email-error').textContent = state.errors.email || '';
      this.querySelector('#password-error').textContent = state.errors.password || '';
      this.querySelector('#terms-error').textContent = state.errors.acceptTerms || '';
      this.querySelector('button').disabled = state.isSubmitting;
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('registration-form', RegistrationForm);
```

:::

## Login Form

Simple login form with email and password.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function LoginForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { email: '', password: '', rememberMe: false },
      fields: {
        email: { validators: (v) => !v.includes('@') && 'Invalid email' },
        password: { validators: (v) => !v && 'Required' },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <div className="form-group">
        <label>Email</label>
        <input {...form.bind('email')} />
        {state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" {...form.bind('password')} />
        {state.errors.password && <span className="error">{state.errors.password}</span>}
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={state.values.rememberMe}
            onChange={(e) => form.setValue('rememberMe', e.target.checked)}
          />
          Remember me
        </label>
      </div>
      <button type="submit" disabled={state.isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { email: '', password: '', rememberMe: false },
  fields: {
    email: { validators: (v) => !v.includes('@') && 'Invalid email' },
    password: { validators: (v) => !v && 'Required' },
  },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <div class="form-group">
      <label>Email</label>
      <input v-bind="form.bind('email')" />
      <span v-if="state.errors.email" class="error">{{ state.errors.email }}</span>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" v-bind="form.bind('password')" />
      <span v-if="state.errors.password" class="error">{{ state.errors.password }}</span>
    </div>
    <div class="form-group">
      <label>
        <input
          type="checkbox"
          :checked="state.values.rememberMe"
          @change="(e) => form.setValue('rememberMe', e.target.checked)" />
        Remember me
      </label>
    </div>
    <button type="submit" :disabled="state.isSubmitting">Login</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { email: '', password: '', rememberMe: false },
    fields: {
      email: { validators: (v) => !v.includes('@') && 'Invalid email' },
      password: { validators: (v) => !v && 'Required' }
    }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <div class="form-group">
    <label>Email</label>
    <input {...form.bind('email')} />
    {#if state.errors.email}<span class="error">{state.errors.email}</span>{/if}
  </div>
  <div class="form-group">
    <label>Password</label>
    <input type="password" {...form.bind('password')} />
    {#if state.errors.password}<span class="error">{state.errors.password}</span>{/if}
  </div>
  <div class="form-group">
    <label>
      <input type="checkbox" checked={state.values.rememberMe} on:change={(e) => form.setValue('rememberMe', e.target.checked)} />
      Remember me
    </label>
  </div>
  <button type="submit" disabled={state.isSubmitting}>Login</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class LoginForm extends HTMLElement {
  #form = createForm({
    initialValues: { email: '', password: '', rememberMe: false },
    fields: {
      email: { validators: (v) => !v.includes('@') && 'Invalid' },
      password: { validators: (v) => !v && 'Required' },
    },
  });
  #unsubscribe;

  connectedCallback() {
    this.innerHTML = `
      <form>
        <div class="form-group">
          <label>Email</label>
          <input name="email">
          <span id="email-error" class="error"></span>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password">
          <span id="password-error" class="error"></span>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="rememberMe"> Remember me</label>
        </div>
        <button type="submit">Login</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    this.querySelectorAll('input').forEach((input) => {
      input.oninput = (e) =>
        this.#form.setValue(input.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    });

    this.#unsubscribe = this.#form.subscribe((state) => {
      this.querySelector('#email-error').textContent = state.errors.email || '';
      this.querySelector('#password-error').textContent = state.errors.password || '';
      this.querySelector('button').disabled = state.isSubmitting;
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('login-form', LoginForm);
```

:::

## Profile Settings

Profile update form with nested objects.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function ProfileSettings({ initialData }) {
  const [form] = useState(() =>
    createForm({
      initialValues: initialData,
      fields: {
        'personal.email': { validators: (v) => !v.includes('@') && 'Invalid email' },
        'address.zipCode': {
          validators: (v, values) => {
            if (values.address.country === 'US' && !/^\d{5}$/.test(v)) return 'Invalid ZIP';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <h3>Personal</h3>
      <input {...form.bind('personal.firstName')} placeholder="First Name" />
      <input {...form.bind('personal.lastName')} placeholder="Last Name" />
      <input {...form.bind('personal.email')} placeholder="Email" />

      <h3>Address</h3>
      <input {...form.bind('address.street')} placeholder="Street" />
      <input {...form.bind('address.city')} placeholder="City" />
      <select {...form.bind('address.country')}>
        <option value="US">US</option>
        <option value="CA">Canada</option>
      </select>
      <input {...form.bind('address.zipCode')} placeholder="ZIP" />

      <h3>Preferences</h3>
      <label>
        <input
          type="checkbox"
          checked={state.values.preferences.newsletter}
          onChange={(e) => form.setValue('preferences.newsletter', e.target.checked)}
        />
        Newsletter
      </label>

      <button type="submit" disabled={state.isSubmitting}>
        Save
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ initialData: any }>();

const form = createForm({
  initialValues: props.initialData,
  fields: {
    'personal.email': { validators: (v) => !v.includes('@') && 'Invalid email' },
  },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('personal.firstName')" placeholder="First Name" />
    <input v-bind="form.bind('personal.email')" placeholder="Email" />

    <input v-bind="form.bind('address.street')" placeholder="Street" />
    <select v-bind="form.bind('address.country')">
      <option value="US">US</option>
    </select>

    <label>
      <input
        type="checkbox"
        :checked="state.values.preferences.newsletter"
        @change="(e) => form.setValue('preferences.newsletter', e.target.checked)" />
      Newsletter
    </label>

    <button type="submit" :disabled="state.isSubmitting">Save</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  export let initialData;

  const form = createForm({
    initialValues: initialData,
    fields: {
      'personal.email': { validators: (v) => !v.includes('@') && 'Invalid email' }
    }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('personal.firstName')} placeholder="First Name" />
  <input {...form.bind('personal.email')} placeholder="Email" />

  <input {...form.bind('address.street')} placeholder="Street" />
  <select {...form.bind('address.country')}>
    <option value="US">US</option>
  </select>

  <label>
    <input type="checkbox" checked={state.values.preferences.newsletter} on:change={(e) => form.setValue('preferences.newsletter', e.target.checked)} />
    Newsletter
  </label>

  <button type="submit" disabled={state.isSubmitting}>Save</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class ProfileSettings extends HTMLElement {
  #form;
  #unsubscribe;

  set initialData(data) {
    this.#form = createForm({
      initialValues: data,
      fields: {
        'personal.email': { validators: (v) => !v.includes('@') && 'Invalid' },
      },
    });
    this.#render();
  }

  #render() {
    this.innerHTML = `
      <form>
        <input name="personal.firstName" placeholder="First Name">
        <input name="personal.email" placeholder="Email">
        <label><input type="checkbox" name="preferences.newsletter"> Newsletter</label>
        <button type="submit">Save</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    this.querySelectorAll('input').forEach((input) => {
      input.oninput = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        this.#form.setValue(input.name, value);
      };
    });

    this.#unsubscribe = this.#form.subscribe((state) => {
      this.querySelector('button').disabled = state.isSubmitting;
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('profile-settings', ProfileSettings);
```

:::

## Multi-Step Form

Wizard-style multi-step form with progress tracking.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [form] = useState(() =>
    createForm({
      initialValues: { email: '', password: '', address: '' },
      fields: {
        email: { validators: (v) => !v.includes('@') && 'Invalid' },
        password: { validators: (v) => v.length < 8 && 'Too short' },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  const next = async () => {
    const fields = step === 1 ? ['email', 'password'] : ['address'];
    const results = await Promise.all(fields.map((f) => form.validateField(f)));
    if (results.every((r) => !r)) setStep((s) => s + 1);
  };

  return (
    <div>
      {step === 1 ? (
        <>
          <input {...form.bind('email')} placeholder="Email" />
          <input type="password" {...form.bind('password')} placeholder="Password" />
        </>
      ) : (
        <input {...form.bind('address')} placeholder="Address" />
      )}
      <button onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
        Back
      </button>
      <button onClick={next}>{step === 2 ? 'Finish' : 'Next'}</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const step = ref(1);
const form = createForm({
  initialValues: { email: '', password: '', address: '' },
  fields: {
    email: { validators: (v) => !v.includes('@') && 'Invalid' },
  },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());

async function next() {
  const fields = step.value === 1 ? ['email', 'password'] : ['address'];
  const results = await Promise.all(fields.map((f) => form.validateField(f)));
  if (results.every((r) => !r)) step.value++;
}
</script>

<template>
  <div>
    <div v-if="step === 1">
      <input v-bind="form.bind('email')" placeholder="Email" />
      <input type="password" v-bind="form.bind('password')" placeholder="Password" />
    </div>
    <div v-else>
      <input v-bind="form.bind('address')" placeholder="Address" />
    </div>
    <button @click="step--" :disabled="step === 1">Back</button>
    <button @click="next">{{ step === 2 ? 'Finish' : 'Next' }}</button>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  let step = 1;
  const form = createForm({
    initialValues: { email: '', password: '', address: '' },
    fields: {
      email: { validators: (v) => !v.includes('@') && 'Invalid' }
    }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);

  async function next() {
    const fields = step === 1 ? ['email', 'password'] : ['address'];
    const results = await Promise.all(fields.map(f => form.validateField(f)));
    if (results.every(r => !r)) step++;
  }
</script>

<div>
  {#if step === 1}
    <input {...form.bind('email')} placeholder="Email" />
    <input type="password" {...form.bind('password')} placeholder="Password" />
  {:else}
    <input {...form.bind('address')} placeholder="Address" />
  {/if}
  <button on:click={() => step--} disabled={step === 1}>Back</button>
  <button on:click={next}>{step === 2 ? 'Finish' : 'Next'}</button>
</div>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class MultiStepForm extends HTMLElement {
  #step = 1;
  #form = createForm({
    initialValues: { email: '', password: '', address: '' },
  });

  connectedCallback() {
    this.#render();
  }

  #render() {
    this.innerHTML = `
      <div>
        ${
          this.#step === 1
            ? `
          <input name="email" placeholder="Email">
          <input name="password" type="password" placeholder="Password">
        `
            : `
          <input name="address" placeholder="Address">
        `
        }
        <button id="back" ${this.#step === 1 ? 'disabled' : ''}>Back</button>
        <button id="next">${this.#step === 2 ? 'Finish' : 'Next'}</button>
      </div>
    `;

    this.querySelector('#back').onclick = () => {
      this.#step--;
      this.#render();
    };
    this.querySelector('#next').onclick = async () => {
      const fields = this.#step === 1 ? ['email', 'password'] : ['address'];
      const results = await Promise.all(fields.map((f) => this.#form.validateField(f)));
      if (results.every((r) => !r)) {
        if (this.#step === 2) this.#form.submit(console.log);
        else {
          this.#step++;
          this.#render();
        }
      }
    };
  }
}
customElements.define('multi-step-form', MultiStepForm);
```

:::

## Dynamic Fields

Form with ability to add/remove fields dynamically.

## Dynamic Fields

Form with ability to add/remove fields dynamically.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function DynamicFieldsForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { contacts: [{ name: '', email: '' }] },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  const add = () => {
    const contacts = form.getValue('contacts');
    form.setValue('contacts', [...contacts, { name: '', email: '' }]);
  };

  const remove = (i) => {
    const contacts = form.getValue('contacts');
    form.setValue(
      'contacts',
      contacts.filter((_, idx) => idx !== i),
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      {state.values.contacts.map((_, i) => (
        <div key={i}>
          <input {...form.bind(`contacts[${i}].name`)} placeholder="Name" />
          <input {...form.bind(`contacts[${i}].email`)} placeholder="Email" />
          <button type="button" onClick={() => remove(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        Add Contact
      </button>
      <button type="submit">Save</button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { contacts: [{ name: '', email: '' }] },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());

function add() {
  const contacts = form.getValue('contacts');
  form.setValue('contacts', [...contacts, { name: '', email: '' }]);
}

function remove(i) {
  const contacts = form.getValue('contacts');
  form.setValue(
    'contacts',
    contacts.filter((_, idx) => idx !== i),
  );
}
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <div v-for="(_, i) in state.values.contacts" :key="i">
      <input v-bind="form.bind(`contacts[${i}].name`)" placeholder="Name" />
      <input v-bind="form.bind(`contacts[${i}].email`)" placeholder="Email" />
      <button type="button" @click="remove(i)">Remove</button>
    </div>
    <button type="button" @click="add">Add Contact</button>
    <button type="submit">Save</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { contacts: [{ name: '', email: '' }] }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);

  function add() {
    const contacts = form.getValue('contacts');
    form.setValue('contacts', [...contacts, { name: '', email: '' }]);
  }

  function remove(i) {
    const contacts = form.getValue('contacts');
    form.setValue('contacts', contacts.filter((_, idx) => idx !== i));
  }
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  {#each state.values.contacts as _, i}
    <div>
      <input {...form.bind(`contacts[${i}].name`)} placeholder="Name" />
      <input {...form.bind(`contacts[${i}].email`)} placeholder="Email" />
      <button type="button" on:click={() => remove(i)}>Remove</button>
    </div>
  {/each}
  <button type="button" on:click={add}>Add Contact</button>
  <button type="submit">Save</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class DynamicFields extends HTMLElement {
  #form = createForm({ initialValues: { contacts: [{ name: '', email: '' }] } });
  #unsubscribe;

  connectedCallback() {
    this.#render();
    this.#unsubscribe = this.#form.subscribe(() => this.#render());
  }

  #render() {
    const values = this.#form.getValue('contacts');
    this.innerHTML = `
      <form>
        ${values
          .map(
            (_, i) => `
          <div>
            <input name="contacts[${i}].name" placeholder="Name">
            <input name="contacts[${i}].email" placeholder="Email">
            <button type="button" class="remove" data-index="${i}">Remove</button>
          </div>
        `,
          )
          .join('')}
        <button type="button" id="add">Add Contact</button>
        <button type="submit">Save</button>
      </form>
    `;

    this.querySelector('#add').onclick = () => {
      this.#form.setValue('contacts', [...values, { name: '', email: '' }]);
    };

    this.querySelectorAll('.remove').forEach((btn) => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.index);
        this.#form.setValue(
          'contacts',
          values.filter((_, idx) => idx !== i),
        );
      };
    });

    this.querySelectorAll('input').forEach((input) => {
      input.oninput = (e) => this.#form.setValue(input.name, e.target.value);
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('dynamic-fields', DynamicFields);
```

:::

## Search Form

Search form with filters and debounced submission.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function SearchForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { query: '', category: 'all' },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <input {...form.bind('query')} placeholder="Search..." />
      <select {...form.bind('category')}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      <button type="submit">Search</button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { query: '', category: 'all' },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('query')" placeholder="Search..." />
    <select v-bind="form.bind('category')">
      <option value="all">All</option>
      <option value="electronics">Electronics</option>
    </select>
    <button type="submit">Search</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { query: '', category: 'all' }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('query')} placeholder="Search..." />
  <select {...form.bind('category')}>
    <option value="all">All</option>
    <option value="electronics">Electronics</option>
  </select>
  <button type="submit">Search</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class SearchForm extends HTMLElement {
  #form = createForm({ initialValues: { query: '', category: 'all' } });

  connectedCallback() {
    this.innerHTML = `
      <form>
        <input name="query" placeholder="Search...">
        <select name="category">
          <option value="all">All</option>
          <option value="electronics">Electronics</option>
        </select>
        <button type="submit">Search</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    this.querySelectorAll('input, select').forEach((el) => {
      el.oninput = (e) => this.#form.setValue(el.name, e.target.value);
    });
  }
}
customElements.define('search-form', SearchForm);
```

:::

## File Upload Form

Form with file upload and preview.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function FileUploadForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { title: '', file: null },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  const handleFileChange = (e) => {
    form.setValue('file', e.target.files?.[0] || null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(console.log);
      }}>
      <input {...form.bind('title')} placeholder="Title" />
      <input type="file" onChange={handleFileChange} />
      <button type="submit">Upload</button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: { title: '', file: null },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());

function handleFileChange(e) {
  form.setValue('file', e.target.files?.[0] || null);
}
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('title')" placeholder="Title" />
    <input type="file" @change="handleFileChange" />
    <button type="submit">Upload</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: { title: '', file: null }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);

  function handleFileChange(e) {
    form.setValue('file', e.target.files?.[0] || null);
  }
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('title')} placeholder="Title" />
  <input type="file" on:change={handleFileChange} />
  <button type="submit">Upload</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class FileUploadForm extends HTMLElement {
  #form = createForm({ initialValues: { title: '', file: null } });

  connectedCallback() {
    this.innerHTML = `
      <form>
        <input name="title" placeholder="Title">
        <input type="file" name="file">
        <button type="submit">Upload</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    this.querySelector('input[name="title"]').oninput = (e) => {
      this.#form.setValue('title', e.target.value);
    };

    this.querySelector('input[name="file"]').onchange = (e) => {
      this.#form.setValue('file', e.target.files?.[0] || null);
    };
  }
}
customElements.define('file-upload-form', FileUploadForm);
```

:::

## Nested Objects

Complex form with deeply nested objects.

````tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface CompanyData {
  company: {
    name: string;
    registration: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
    contact: {
      email: string;
      phone: string;
      website: string;
    };
  };
  billing: {
    sameAsCompany: boolean;
    address: {
      street: string;
      city: string;
      country: string;
    };
  };
}

## Nested Objects

Complex form with deeply nested objects.

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

function CompanyForm() {
  const [form] = useState(() => createForm({
    initialValues: {
      company: { name: '', address: { city: '' } }
    }
  }));

  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit(console.log); }}>
      <input {...form.bind('company.name')} placeholder="Company Name" />
      <input {...form.bind('company.address.city')} placeholder="City" />
      <button type="submit">Save</button>
    </form>
  );
}
````

```vue [Vue 3]
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  initialValues: {
    company: { name: '', address: { city: '' } },
  },
});

const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit(console.log)">
    <input v-bind="form.bind('company.name')" placeholder="Company Name" />
    <input v-bind="form.bind('company.address.city')" placeholder="City" />
    <button type="submit">Save</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  const form = createForm({
    initialValues: {
      company: { name: '', address: { city: '' } }
    }
  });

  let state = form.getStateSnapshot();
  const unsubscribe = form.subscribe(s => state = s);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('company.name')} placeholder="Company Name" />
  <input {...form.bind('company.address.city')} placeholder="City" />
  <button type="submit">Save</button>
</form>
```

```ts [Web Component]
import { createForm } from '@vielzeug/formit';

class CompanyForm extends HTMLElement {
  #form = createForm({
    initialValues: {
      company: { name: '', address: { city: '' } },
    },
  });

  connectedCallback() {
    this.innerHTML = `
      <form>
        <input name="company.name" placeholder="Company Name">
        <input name="company.address.city" placeholder="City">
        <button type="submit">Save</button>
      </form>
    `;

    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#form.submit(console.log);
    };

    this.querySelectorAll('input').forEach((input) => {
      input.oninput = (e) => this.#form.setValue(input.name, e.target.value);
    });
  }
}
customElements.define('company-form', CompanyForm);
```

:::

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Usage Guide](./usage.md) - Common patterns and best practices
