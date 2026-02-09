# Formit Examples

Real-world examples demonstrating common use cases and patterns with Formit.

## Table of Contents

- [Framework Integration Examples](#framework-integration-examples)
  - [React](#react)
  - [Vue 3](#vue-3)
  - [Svelte](#svelte)
- [Registration Form](#registration-form)
- [Login Form](#login-form)
- [Profile Settings](#profile-settings)
- [Multi-Step Form](#multi-step-form)
- [Dynamic Fields](#dynamic-fields)
- [Search Form](#search-form)
- [File Upload Form](#file-upload-form)
- [Nested Objects](#nested-objects)

## Framework Integration Examples

Complete examples showing how to integrate Formit with React, Vue, and Svelte. Each framework has two patterns: inline usage and reusable hook/composable.

### React

#### Inline Component Usage

```tsx
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function ContactForm() {
  const [form] = useState(() =>
    createForm<ContactFormData>({
      initialValues: {
        name: '',
        email: '',
        subject: '',
        message: '',
      },
      fields: {
        name: {
          validators: (value) => {
            if (!value) return 'Name is required';
            if (value.length < 2) return 'Name must be at least 2 characters';
          },
        },
        email: {
          validators: [
            (value) => {
              if (!value) return 'Email is required';
            },
            (value) => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return 'Invalid email format';
              }
            },
          ],
        },
        subject: {
          validators: (value) => {
            if (!value) return 'Subject is required';
          },
        },
        message: {
          validators: (value) => {
            if (!value) return 'Message is required';
            if (value.length < 10) return 'Message must be at least 10 characters';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      });

      setSubmitStatus('success');

      // Reset form after successful submission
      form.setValues(
        {
          name: '',
          email: '',
          subject: '',
          message: '',
        },
        { replace: true },
      );
      form.resetErrors();
    } catch (error) {
      setSubmitStatus('error');
      console.error('Contact form error:', error);
    }
  };

  return (
    <div className="contact-form-container">
      <h2>Contact Us</h2>

      {submitStatus === 'success' && (
        <div className="alert alert-success">Thank you! Your message has been sent successfully.</div>
      )}

      {submitStatus === 'error' && <div className="alert alert-error">Failed to send message. Please try again.</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input id="name" {...form.bind('name')} onBlur={() => form.markTouched('name')} />
          {state.touched.name && state.errors.name && <span className="error">{state.errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input id="email" type="email" {...form.bind('email')} onBlur={() => form.markTouched('email')} />
          {state.touched.email && state.errors.email && <span className="error">{state.errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input id="subject" {...form.bind('subject')} onBlur={() => form.markTouched('subject')} />
          {state.touched.subject && state.errors.subject && <span className="error">{state.errors.subject}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea id="message" rows={5} {...form.bind('message')} onBlur={() => form.markTouched('message')} />
          {state.touched.message && state.errors.message && <span className="error">{state.errors.message}</span>}
        </div>

        <button type="submit" disabled={state.isSubmitting || state.isValidating} className="btn btn-primary">
          {state.isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}

export default ContactForm;
```

#### Using Custom useForm Hook

```tsx
// hooks/useForm.ts
import { createForm, FormInit, FormState } from '@vielzeug/formit';
import { useEffect, useState, useMemo } from 'react';

export function useForm<TForm extends Record<string, any>>(init: FormInit<TForm>) {
  const form = useMemo(() => createForm(init), []);
  const [state, setState] = useState<FormState<TForm>>(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  return { form, state };
}

// ContactForm.tsx
import { useForm } from './hooks/useForm';
import { useState } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function ContactForm() {
  const { form, state } = useForm<ContactFormData>({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
    fields: {
      name: {
        validators: (value) => {
          if (!value) return 'Name is required';
          if (value.length < 2) return 'Name must be at least 2 characters';
        },
      },
      email: {
        validators: [
          (value) => {
            if (!value) return 'Email is required';
          },
          (value) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return 'Invalid email format';
            }
          },
        ],
      },
      subject: {
        validators: (value) => {
          if (!value) return 'Subject is required';
        },
      },
      message: {
        validators: (value) => {
          if (!value) return 'Message is required';
          if (value.length < 10) return 'Message must be at least 10 characters';
        },
      },
    },
  });

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      });

      setSubmitStatus('success');
      form.setValues(
        {
          name: '',
          email: '',
          subject: '',
          message: '',
        },
        { replace: true },
      );
      form.resetErrors();
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  return (
    <div className="contact-form-container">
      <h2>Contact Us</h2>

      {submitStatus === 'success' && (
        <div className="alert alert-success">Thank you! Your message has been sent successfully.</div>
      )}

      {submitStatus === 'error' && <div className="alert alert-error">Failed to send message. Please try again.</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input id="name" {...form.bind('name')} onBlur={() => form.markTouched('name')} />
          {state.touched.name && state.errors.name && <span className="error">{state.errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input id="email" type="email" {...form.bind('email')} onBlur={() => form.markTouched('email')} />
          {state.touched.email && state.errors.email && <span className="error">{state.errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input id="subject" {...form.bind('subject')} onBlur={() => form.markTouched('subject')} />
          {state.touched.subject && state.errors.subject && <span className="error">{state.errors.subject}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea id="message" rows={5} {...form.bind('message')} onBlur={() => form.markTouched('message')} />
          {state.touched.message && state.errors.message && <span className="error">{state.errors.message}</span>}
        </div>

        <button type="submit" disabled={state.isSubmitting || state.isValidating} className="btn btn-primary">
          {state.isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}

export default ContactForm;
```

### Vue 3

#### Inline Component Usage

```vue
<script setup lang="ts">
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const form = createForm<ContactFormData>({
  initialValues: {
    name: '',
    email: '',
    subject: '',
    message: '',
  },
  fields: {
    name: {
      validators: (value) => {
        if (!value) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
      },
    },
    email: {
      validators: [
        (value) => {
          if (!value) return 'Email is required';
        },
        (value) => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Invalid email format';
          }
        },
      ],
    },
    subject: {
      validators: (value) => {
        if (!value) return 'Subject is required';
      },
    },
    message: {
      validators: (value) => {
        if (!value) return 'Message is required';
        if (value.length < 10) return 'Message must be at least 10 characters';
      },
    },
  },
});

const state = ref(form.getStateSnapshot());
const submitStatus = ref<'idle' | 'success' | 'error'>('idle');
let unsubscribe: (() => void) | undefined;

onMounted(() => {
  unsubscribe = form.subscribe((newState) => {
    state.value = newState;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});

async function handleSubmit() {
  submitStatus.value = 'idle';

  try {
    await form.submit(async (values) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Submission failed');
      return response.json();
    });

    submitStatus.value = 'success';

    form.setValues(
      {
        name: '',
        email: '',
        subject: '',
        message: '',
      },
      { replace: true },
    );
    form.resetErrors();
  } catch (error) {
    submitStatus.value = 'error';
    console.error('Contact form error:', error);
  }
}

function handleBlur(field: keyof ContactFormData) {
  form.markTouched(field);
}
</script>

<template>
  <div class="contact-form-container">
    <h2>Contact Us</h2>

    <div v-if="submitStatus === 'success'" class="alert alert-success">
      Thank you! Your message has been sent successfully.
    </div>

    <div v-if="submitStatus === 'error'" class="alert alert-error">Failed to send message. Please try again.</div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="name">Name *</label>
        <input id="name" v-bind="form.bind('name')" @blur="handleBlur('name')" />
        <span v-if="state.touched.name && state.errors.name" class="error">
          {{ state.errors.name }}
        </span>
      </div>

      <div class="form-group">
        <label for="email">Email *</label>
        <input id="email" type="email" v-bind="form.bind('email')" @blur="handleBlur('email')" />
        <span v-if="state.touched.email && state.errors.email" class="error">
          {{ state.errors.email }}
        </span>
      </div>

      <div class="form-group">
        <label for="subject">Subject *</label>
        <input id="subject" v-bind="form.bind('subject')" @blur="handleBlur('subject')" />
        <span v-if="state.touched.subject && state.errors.subject" class="error">
          {{ state.errors.subject }}
        </span>
      </div>

      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" rows="5" v-bind="form.bind('message')" @blur="handleBlur('message')" />
        <span v-if="state.touched.message && state.errors.message" class="error">
          {{ state.errors.message }}
        </span>
      </div>

      <button type="submit" :disabled="state.isSubmitting || state.isValidating" class="btn btn-primary">
        {{ state.isSubmitting ? 'Sending...' : 'Send Message' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
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
</style>
```

#### Using Custom useForm Composable

```ts
// composables/useForm.ts
import { createForm, FormInit, FormState } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted, Ref } from 'vue';

export function useForm<TForm extends Record<string, any>>(init: FormInit<TForm>) {
  const form = createForm(init);
  const state: Ref<FormState<TForm>> = ref(form.getStateSnapshot());

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = form.subscribe((newState) => {
      state.value = newState;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return { form, state };
}
```

```vue
<!-- ContactForm.vue -->
<script setup lang="ts">
import { useForm } from './composables/useForm';
import { ref } from 'vue';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const { form, state } = useForm<ContactFormData>({
  initialValues: {
    name: '',
    email: '',
    subject: '',
    message: '',
  },
  fields: {
    name: {
      validators: (value) => {
        if (!value) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
      },
    },
    email: {
      validators: [
        (value) => {
          if (!value) return 'Email is required';
        },
        (value) => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Invalid email format';
          }
        },
      ],
    },
    subject: {
      validators: (value) => {
        if (!value) return 'Subject is required';
      },
    },
    message: {
      validators: (value) => {
        if (!value) return 'Message is required';
        if (value.length < 10) return 'Message must be at least 10 characters';
      },
    },
  },
});

const submitStatus = ref<'idle' | 'success' | 'error'>('idle');

async function handleSubmit() {
  submitStatus.value = 'idle';

  try {
    await form.submit(async (values) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Submission failed');
      return response.json();
    });

    submitStatus.value = 'success';

    form.setValues(
      {
        name: '',
        email: '',
        subject: '',
        message: '',
      },
      { replace: true },
    );
    form.resetErrors();
  } catch (error) {
    submitStatus.value = 'error';
  }
}

function handleBlur(field: keyof ContactFormData) {
  form.markTouched(field);
}
</script>

<template>
  <div class="contact-form-container">
    <h2>Contact Us</h2>

    <div v-if="submitStatus === 'success'" class="alert alert-success">
      Thank you! Your message has been sent successfully.
    </div>

    <div v-if="submitStatus === 'error'" class="alert alert-error">Failed to send message. Please try again.</div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="name">Name *</label>
        <input id="name" v-bind="form.bind('name')" @blur="handleBlur('name')" />
        <span v-if="state.touched.name && state.errors.name" class="error">
          {{ state.errors.name }}
        </span>
      </div>

      <div class="form-group">
        <label for="email">Email *</label>
        <input id="email" type="email" v-bind="form.bind('email')" @blur="handleBlur('email')" />
        <span v-if="state.touched.email && state.errors.email" class="error">
          {{ state.errors.email }}
        </span>
      </div>

      <div class="form-group">
        <label for="subject">Subject *</label>
        <input id="subject" v-bind="form.bind('subject')" @blur="handleBlur('subject')" />
        <span v-if="state.touched.subject && state.errors.subject" class="error">
          {{ state.errors.subject }}
        </span>
      </div>

      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" rows="5" v-bind="form.bind('message')" @blur="handleBlur('message')" />
        <span v-if="state.touched.message && state.errors.message" class="error">
          {{ state.errors.message }}
        </span>
      </div>

      <button type="submit" :disabled="state.isSubmitting || state.isValidating" class="btn btn-primary">
        {{ state.isSubmitting ? 'Sending...' : 'Send Message' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
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
</style>
```

### Svelte

#### Inline Component Usage

```svelte
<script lang="ts">
  import { createForm } from '@vielzeug/formit';
  import { onDestroy } from 'svelte';

  interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
  }

  const form = createForm<ContactFormData>({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
    fields: {
      name: {
        validators: (value) => {
          if (!value) return 'Name is required';
          if (value.length < 2) return 'Name must be at least 2 characters';
        },
      },
      email: {
        validators: [
          (value) => {
            if (!value) return 'Email is required';
          },
          (value) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return 'Invalid email format';
            }
          },
        ],
      },
      subject: {
        validators: (value) => {
          if (!value) return 'Subject is required';
        },
      },
      message: {
        validators: (value) => {
          if (!value) return 'Message is required';
          if (value.length < 10) return 'Message must be at least 10 characters';
        },
      },
    },
  });

  let state = form.getStateSnapshot();
  let submitStatus: 'idle' | 'success' | 'error' = 'idle';

  const unsubscribe = form.subscribe((newState) => {
    state = newState;
  });

  onDestroy(() => {
    unsubscribe();
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitStatus = 'idle';

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      });

      submitStatus = 'success';

      form.setValues({
        name: '',
        email: '',
        subject: '',
        message: '',
      }, { replace: true });
      form.resetErrors();
    } catch (error) {
      submitStatus = 'error';
      console.error('Contact form error:', error);
    }
  }

  function handleBlur(field: keyof ContactFormData) {
    form.markTouched(field);
  }
</script>

<div class="contact-form-container">
  <h2>Contact Us</h2>

  {#if submitStatus === 'success'}
    <div class="alert alert-success">
      Thank you! Your message has been sent successfully.
    </div>
  {/if}

  {#if submitStatus === 'error'}
    <div class="alert alert-error">
      Failed to send message. Please try again.
    </div>
  {/if}

  <form on:submit={handleSubmit}>
    <div class="form-group">
      <label for="name">Name *</label>
      <input
        id="name"
        {...form.bind('name')}
        on:blur={() => handleBlur('name')}
      />
      {#if state.touched.name && state.errors.name}
        <span class="error">{state.errors.name}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="email">Email *</label>
      <input
        id="email"
        type="email"
        {...form.bind('email')}
        on:blur={() => handleBlur('email')}
      />
      {#if state.touched.email && state.errors.email}
        <span class="error">{state.errors.email}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="subject">Subject *</label>
      <input
        id="subject"
        {...form.bind('subject')}
        on:blur={() => handleBlur('subject')}
      />
      {#if state.touched.subject && state.errors.subject}
        <span class="error">{state.errors.subject}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="message">Message *</label>
      <textarea
        id="message"
        rows="5"
        {...form.bind('message')}
        on:blur={() => handleBlur('message')}
      />
      {#if state.touched.message && state.errors.message}
        <span class="error">{state.errors.message}</span>
      {/if}
    </div>

    <button
      type="submit"
      disabled={state.isSubmitting || state.isValidating}
      class="btn btn-primary"
    >
      {state.isSubmitting ? 'Sending...' : 'Send Message'}
    </button>
  </form>
</div>

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
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
```

#### Using Custom useForm Store

```ts
// stores/useForm.ts
import { createForm, FormInit, FormState } from '@vielzeug/formit';
import { writable } from 'svelte/store';
import { onDestroy } from 'svelte';

export function useForm<TForm extends Record<string, any>>(init: FormInit<TForm>) {
  const form = createForm(init);
  const state = writable<FormState<TForm>>(form.getStateSnapshot());

  const unsubscribe = form.subscribe((newState) => {
    state.set(newState);
  });

  onDestroy(() => {
    unsubscribe();
  });

  return { form, state };
}
```

```svelte
<!-- ContactForm.svelte -->
<script lang="ts">
  import { useForm } from './stores/useForm';

  interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
  }

  const { form, state } = useForm<ContactFormData>({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
    fields: {
      name: {
        validators: (value) => {
          if (!value) return 'Name is required';
          if (value.length < 2) return 'Name must be at least 2 characters';
        },
      },
      email: {
        validators: [
          (value) => {
            if (!value) return 'Email is required';
          },
          (value) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return 'Invalid email format';
            }
          },
        ],
      },
      subject: {
        validators: (value) => {
          if (!value) return 'Subject is required';
        },
      },
      message: {
        validators: (value) => {
          if (!value) return 'Message is required';
          if (value.length < 10) return 'Message must be at least 10 characters';
        },
      },
    },
  });

  let submitStatus: 'idle' | 'success' | 'error' = 'idle';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitStatus = 'idle';

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Submission failed');
        return response.json();
      });

      submitStatus = 'success';

      form.setValues({
        name: '',
        email: '',
        subject: '',
        message: '',
      }, { replace: true });
      form.resetErrors();
    } catch (error) {
      submitStatus = 'error';
    }
  }

  function handleBlur(field: keyof ContactFormData) {
    form.markTouched(field);
  }
</script>

<div class="contact-form-container">
  <h2>Contact Us</h2>

  {#if submitStatus === 'success'}
    <div class="alert alert-success">
      Thank you! Your message has been sent successfully.
    </div>
  {/if}

  {#if submitStatus === 'error'}
    <div class="alert alert-error">
      Failed to send message. Please try again.
    </div>
  {/if}

  <form on:submit={handleSubmit}>
    <div class="form-group">
      <label for="name">Name *</label>
      <input
        id="name"
        {...form.bind('name')}
        on:blur={() => handleBlur('name')}
      />
      {#if $state.touched.name && $state.errors.name}
        <span class="error">{$state.errors.name}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="email">Email *</label>
      <input
        id="email"
        type="email"
        {...form.bind('email')}
        on:blur={() => handleBlur('email')}
      />
      {#if $state.touched.email && $state.errors.email}
        <span class="error">{$state.errors.email}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="subject">Subject *</label>
      <input
        id="subject"
        {...form.bind('subject')}
        on:blur={() => handleBlur('subject')}
      />
      {#if $state.touched.subject && $state.errors.subject}
        <span class="error">{$state.errors.subject}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="message">Message *</label>
      <textarea
        id="message"
        rows="5"
        {...form.bind('message')}
        on:blur={() => handleBlur('message')}
      />
      {#if $state.touched.message && $state.errors.message}
        <span class="error">{$state.errors.message}</span>
      {/if}
    </div>

    <button
      type="submit"
      disabled={$state.isSubmitting || $state.isValidating}
      class="btn btn-primary"
    >
      {$state.isSubmitting ? 'Sending...' : 'Send Message'}
    </button>
  </form>
</div>

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
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
```

---

## Registration Form

Complete registration form with validation, error handling, and submission.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

function RegistrationForm() {
  const [form] = useState(() =>
    createForm<RegistrationData>({
      initialValues: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
      },
      fields: {
        username: {
          validators: [
            (value) => {
              if (!value) return 'Username is required';
              if (value.length < 3) return 'Username must be at least 3 characters';
              if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
            },
            async (value) => {
              const response = await fetch(`/api/check-username?username=${value}`);
              const { exists } = await response.json();
              if (exists) return 'Username is already taken';
            },
          ],
        },
        email: {
          validators: [
            (value) => {
              if (!value) return 'Email is required';
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
            },
            async (value) => {
              const response = await fetch(`/api/check-email?email=${value}`);
              const { exists } = await response.json();
              if (exists) return 'Email is already registered';
            },
          ],
        },
        password: {
          validators: (value) => {
            if (!value) return 'Password is required';
            if (value.length < 8) return 'Password must be at least 8 characters';
            if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
            if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
            if (!/[0-9]/.test(value)) return 'Password must contain a number';
          },
        },
        acceptTerms: {
          validators: (value) => {
            if (!value) return 'You must accept the terms and conditions';
          },
        },
      },
      validate: (values) => {
        if (values.password !== values.confirmPassword) {
          return { confirmPassword: 'Passwords do not match' };
        }
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Registration failed');

        return response.json();
      });

      setSuccessMessage('Registration successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="registration-form">
      <h2>Create Account</h2>

      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          {...form.bind('username')}
          onBlur={() => {
            form.markTouched('username');
            form.validateField('username');
          }}
        />
        {state.touched.username && state.errors.username && <span className="error">{state.errors.username}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...form.bind('email')}
          onBlur={() => {
            form.markTouched('email');
            form.validateField('email');
          }}
        />
        {state.touched.email && state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...form.bind('password')}
          onBlur={() => {
            form.markTouched('password');
            form.validateField('password');
          }}
        />
        {state.touched.password && state.errors.password && <span className="error">{state.errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          {...form.bind('confirmPassword')}
          onBlur={() => {
            form.markTouched('confirmPassword');
            form.validateField('confirmPassword');
          }}
        />
        {state.touched.confirmPassword && state.errors.confirmPassword && (
          <span className="error">{state.errors.confirmPassword}</span>
        )}
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={state.values.acceptTerms}
            onChange={(e) => form.setValue('acceptTerms', e.target.checked)}
          />
          I accept the <a href="/terms">terms and conditions</a>
        </label>
        {state.errors.acceptTerms && <span className="error">{state.errors.acceptTerms}</span>}
      </div>

      <button type="submit" disabled={state.isSubmitting || state.isValidating} className="submit-button">
        {state.isSubmitting ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

## Login Form

Simple login form with email and password.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginForm() {
  const [form] = useState(() =>
    createForm<LoginData>({
      initialValues: {
        email: '',
        password: '',
        rememberMe: false,
      },
      fields: {
        email: {
          validators: (value) => {
            if (!value) return 'Email is required';
            if (!value.includes('@')) return 'Invalid email';
          },
        },
        password: {
          validators: (value) => {
            if (!value) return 'Password is required';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();

        if (values.rememberMe) {
          localStorage.setItem('authToken', data.token);
        } else {
          sessionStorage.setItem('authToken', data.token);
        }

        window.location.href = '/dashboard';
      });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>

      {loginError && <div className="error-banner">{loginError}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...form.bind('email')} autoComplete="email" />
        {state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...form.bind('password')} autoComplete="current-password" />
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

      <button type="submit" disabled={state.isSubmitting} className="submit-button">
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>

      <div className="links">
        <a href="/forgot-password">Forgot password?</a>
        <a href="/register">Create account</a>
      </div>
    </form>
  );
}
```

## Profile Settings

Profile update form with nested objects.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface ProfileData {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
}

function ProfileSettings({ initialData }: { initialData: ProfileData }) {
  const [form] = useState(() =>
    createForm<ProfileData>({
      initialValues: initialData,
      fields: {
        'personal.email': {
          validators: (value) => {
            if (!value) return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email';
          },
        },
        'personal.phone': {
          validators: (value) => {
            if (value && !/^\+?[\d\s-()]+$/.test(value)) {
              return 'Invalid phone number';
            }
          },
        },
        'address.zipCode': {
          validators: (value, values) => {
            if (!value) return;

            if (values.address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(value)) {
              return 'Invalid US ZIP code';
            }
            if (values.address.country === 'UK' && !/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i.test(value)) {
              return 'Invalid UK postcode';
            }
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('');

    try {
      await form.submit(async (values) => {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Failed to save profile');

        return response.json();
      });

      setSaveStatus('Profile saved successfully!');
    } catch (error) {
      setSaveStatus('Failed to save profile');
    }
  };

  const isDirty = Object.values(state.dirty).some(Boolean);

  return (
    <form onSubmit={handleSubmit} className="profile-settings">
      <h2>Profile Settings</h2>

      {saveStatus && (
        <div className={`status-message ${saveStatus.includes('success') ? 'success' : 'error'}`}>{saveStatus}</div>
      )}

      <section>
        <h3>Personal Information</h3>

        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input {...form.bind('personal.firstName')} />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input {...form.bind('personal.lastName')} />
          </div>
        </div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" {...form.bind('personal.email')} />
          {state.errors['personal.email'] && <span className="error">{state.errors['personal.email']}</span>}
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input type="tel" {...form.bind('personal.phone')} />
          {state.errors['personal.phone'] && <span className="error">{state.errors['personal.phone']}</span>}
        </div>
      </section>

      <section>
        <h3>Address</h3>

        <div className="form-group">
          <label>Street Address</label>
          <input {...form.bind('address.street')} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input {...form.bind('address.city')} />
          </div>

          <div className="form-group">
            <label>State</label>
            <input {...form.bind('address.state')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>ZIP Code</label>
            <input {...form.bind('address.zipCode')} />
            {state.errors['address.zipCode'] && <span className="error">{state.errors['address.zipCode']}</span>}
          </div>

          <div className="form-group">
            <label>Country</label>
            <select {...form.bind('address.country')}>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h3>Preferences</h3>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={state.values.preferences.newsletter}
              onChange={(e) => form.setValue('preferences.newsletter', e.target.checked)}
            />
            Subscribe to newsletter
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={state.values.preferences.notifications}
              onChange={(e) => form.setValue('preferences.notifications', e.target.checked)}
            />
            Enable notifications
          </label>
        </div>
      </section>

      <div className="form-actions">
        <button
          type="button"
          onClick={() => {
            form.setValues(initialData, { replace: true });
            form.resetErrors();
          }}
          disabled={!isDirty || state.isSubmitting}>
          Reset
        </button>

        <button type="submit" disabled={!isDirty || state.isSubmitting} className="primary">
          {state.isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
```

## Multi-Step Form

Wizard-style multi-step form with progress tracking.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface WizardData {
  // Step 1: Account
  username: string;
  email: string;
  password: string;

  // Step 2: Profile
  firstName: string;
  lastName: string;
  bio: string;

  // Step 3: Preferences
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const steps = [
  { id: 1, title: 'Account', fields: ['username', 'email', 'password'] },
  { id: 2, title: 'Profile', fields: ['firstName', 'lastName', 'bio'] },
  { id: 3, title: 'Preferences', fields: ['theme', 'language', 'notifications'] },
];

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form] = useState(() =>
    createForm<WizardData>({
      initialValues: {
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        bio: '',
        theme: 'light',
        language: 'en',
        notifications: true,
      },
      fields: {
        username: {
          validators: (value) => {
            if (!value) return 'Username is required';
            if (value.length < 3) return 'Username too short';
          },
        },
        email: {
          validators: (value) => {
            if (!value) return 'Email is required';
            if (!value.includes('@')) return 'Invalid email';
          },
        },
        password: {
          validators: (value) => {
            if (!value) return 'Password is required';
            if (value.length < 8) return 'Password too short';
          },
        },
        firstName: {
          validators: (value) => {
            if (!value) return 'First name is required';
          },
        },
        lastName: {
          validators: (value) => {
            if (!value) return 'Last name is required';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const validateCurrentStep = async () => {
    const stepFields = steps.find((s) => s.id === currentStep)?.fields || [];

    for (const field of stepFields) {
      const error = await form.validateField(field);
      if (error) {
        form.markTouched(field);
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateCurrentStep();
    if (!isValid) return;

    await form.submit(async (values) => {
      const response = await fetch('/api/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      return response.json();
    });
  };

  return (
    <div className="multi-step-form">
      <div className="progress-bar">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
            <span className="step-number">{step.id}</span>
            <span className="step-title">{step.title}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Create Account</h2>

            <div className="form-group">
              <label>Username</label>
              <input {...form.bind('username')} />
              {state.touched.username && state.errors.username && (
                <span className="error">{state.errors.username}</span>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" {...form.bind('email')} />
              {state.touched.email && state.errors.email && <span className="error">{state.errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" {...form.bind('password')} />
              {state.touched.password && state.errors.password && (
                <span className="error">{state.errors.password}</span>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-content">
            <h2>Your Profile</h2>

            <div className="form-group">
              <label>First Name</label>
              <input {...form.bind('firstName')} />
              {state.touched.firstName && state.errors.firstName && (
                <span className="error">{state.errors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input {...form.bind('lastName')} />
              {state.touched.lastName && state.errors.lastName && (
                <span className="error">{state.errors.lastName}</span>
              )}
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea {...form.bind('bio')} rows={4} />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-content">
            <h2>Preferences</h2>

            <div className="form-group">
              <label>Theme</label>
              <select {...form.bind('theme')}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select {...form.bind('language')}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={state.values.notifications}
                  onChange={(e) => form.setValue('notifications', e.target.checked)}
                />
                Enable notifications
              </label>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={handlePrevious} disabled={currentStep === 1}>
            Previous
          </button>

          {currentStep < steps.length ? (
            <button type="button" onClick={handleNext} className="primary">
              Next
            </button>
          ) : (
            <button type="submit" disabled={state.isSubmitting} className="primary">
              {state.isSubmitting ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

## Dynamic Fields

Form with ability to add/remove fields dynamically.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface Contact {
  name: string;
  email: string;
  phone: string;
}

interface DynamicFormData {
  contacts: Contact[];
}

function DynamicFieldsForm() {
  const [form] = useState(() =>
    createForm<DynamicFormData>({
      initialValues: {
        contacts: [{ name: '', email: '', phone: '' }],
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const addContact = () => {
    const contacts = form.getValue('contacts');
    form.setValue('contacts', [...contacts, { name: '', email: '', phone: '' }]);
  };

  const removeContact = (index: number) => {
    const contacts = form.getValue('contacts');
    if (contacts.length > 1) {
      form.setValue(
        'contacts',
        contacts.filter((_, i) => i !== index),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all contact fields
    let hasErrors = false;
    const contacts = form.getValue('contacts');

    for (let i = 0; i < contacts.length; i++) {
      if (!contacts[i].name) {
        form.setError(`contacts[${i}].name`, 'Name is required');
        hasErrors = true;
      }
      if (!contacts[i].email || !contacts[i].email.includes('@')) {
        form.setError(`contacts[${i}].email`, 'Valid email is required');
        hasErrors = true;
      }
    }

    if (hasErrors) return;

    await form.submit(
      async (values) => {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        return response.json();
      },
      { validate: false },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="dynamic-form">
      <h2>Manage Contacts</h2>

      {state.values.contacts.map((contact, index) => (
        <div key={index} className="contact-group">
          <h3>Contact {index + 1}</h3>

          <div className="form-group">
            <label>Name</label>
            <input {...form.bind(`contacts[${index}].name`)} />
            {state.errors[`contacts[${index}].name`] && (
              <span className="error">{state.errors[`contacts[${index}].name`]}</span>
            )}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" {...form.bind(`contacts[${index}].email`)} />
            {state.errors[`contacts[${index}].email`] && (
              <span className="error">{state.errors[`contacts[${index}].email`]}</span>
            )}
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input type="tel" {...form.bind(`contacts[${index}].phone`)} />
          </div>

          {state.values.contacts.length > 1 && (
            <button type="button" onClick={() => removeContact(index)} className="remove-button">
              Remove Contact
            </button>
          )}
        </div>
      ))}

      <div className="form-actions">
        <button type="button" onClick={addContact} className="add-button">
          + Add Contact
        </button>

        <button type="submit" disabled={state.isSubmitting} className="primary">
          {state.isSubmitting ? 'Saving...' : 'Save Contacts'}
        </button>
      </div>
    </form>
  );
}
```

## Search Form

Search form with filters and debounced submission.

```tsx
import { createForm } from '@vielzeug/formit';
import { debounce } from '@vielzeug/toolkit';
import { useState, useEffect } from 'react';

interface SearchFilters {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  sortBy: 'relevance' | 'price-asc' | 'price-desc' | 'newest';
}

function SearchForm({ onSearch }: { onSearch: (filters: SearchFilters) => void }) {
  const [form] = useState(() =>
    createForm<SearchFilters>({
      initialValues: {
        query: '',
        category: 'all',
        minPrice: 0,
        maxPrice: 10000,
        inStock: false,
        sortBy: 'relevance',
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  // Debounced search
  const debouncedSearch = debounce((filters: SearchFilters) => {
    onSearch(filters);
  }, 300);

  useEffect(() => {
    debouncedSearch(state.values);
  }, [state.values]);

  const handleReset = () => {
    form.setValues(
      {
        query: '',
        category: 'all',
        minPrice: 0,
        maxPrice: 10000,
        inStock: false,
        sortBy: 'relevance',
      },
      { replace: true },
    );
  };

  return (
    <form className="search-form" onSubmit={(e) => e.preventDefault()}>
      <div className="search-bar">
        <input {...form.bind('query')} type="search" placeholder="Search products..." className="search-input" />
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Category</label>
          <select {...form.bind('category')}>
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="books">Books</option>
            <option value="home">Home & Garden</option>
          </select>
        </div>

        <div className="form-group">
          <label>Price Range</label>
          <div className="price-range">
            <input type="number" {...form.bind('minPrice')} placeholder="Min" min="0" />
            <span>to</span>
            <input type="number" {...form.bind('maxPrice')} placeholder="Max" min="0" />
          </div>
        </div>

        <div className="form-group">
          <label>Sort By</label>
          <select {...form.bind('sortBy')}>
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={state.values.inStock}
              onChange={(e) => form.setValue('inStock', e.target.checked)}
            />
            In Stock Only
          </label>
        </div>
      </div>

      <button type="button" onClick={handleReset} className="reset-button">
        Reset Filters
      </button>
    </form>
  );
}
```

## File Upload Form

Form with file upload and preview.

```tsx
import { createForm } from '@vielzeug/formit';
import { useState, useEffect } from 'react';

interface FileUploadData {
  title: string;
  description: string;
  category: string;
  file: File | null;
}

function FileUploadForm() {
  const [form] = useState(() =>
    createForm<FileUploadData>({
      initialValues: {
        title: '',
        description: '',
        category: '',
        file: null,
      },
      fields: {
        title: {
          validators: (value) => {
            if (!value) return 'Title is required';
            if (value.length < 3) return 'Title must be at least 3 characters';
          },
        },
        category: {
          validators: (value) => {
            if (!value) return 'Category is required';
          },
        },
        file: {
          validators: (value) => {
            if (!value) return 'File is required';
            if (value.size > 5 * 1024 * 1024) return 'File must be smaller than 5MB';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    form.setValue('file', file);

    // Create preview for images
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await form.submit(async (values) => {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('category', values.category);
      if (values.file) {
        formData.append('file', values.file);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      return response.json();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="file-upload-form">
      <h2>Upload File</h2>

      <div className="form-group">
        <label>Title</label>
        <input {...form.bind('title')} />
        {state.errors.title && <span className="error">{state.errors.title}</span>}
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea {...form.bind('description')} rows={4} />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select {...form.bind('category')}>
          <option value="">Select category...</option>
          <option value="documents">Documents</option>
          <option value="images">Images</option>
          <option value="videos">Videos</option>
        </select>
        {state.errors.category && <span className="error">{state.errors.category}</span>}
      </div>

      <div className="form-group">
        <label>File</label>
        <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" />
        {state.errors.file && <span className="error">{state.errors.file}</span>}

        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" />
          </div>
        )}

        {state.values.file && (
          <div className="file-info">
            <p>Name: {state.values.file.name}</p>
            <p>Size: {(state.values.file.size / 1024).toFixed(2)} KB</p>
            <p>Type: {state.values.file.type}</p>
          </div>
        )}
      </div>

      <button type="submit" disabled={state.isSubmitting} className="submit-button">
        {state.isSubmitting ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
```

## Nested Objects

Complex form with deeply nested objects.

```tsx
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

function CompanyForm() {
  const [form] = useState(() =>
    createForm<CompanyData>({
      initialValues: {
        company: {
          name: '',
          registration: '',
          address: {
            street: '',
            city: '',
            country: '',
          },
          contact: {
            email: '',
            phone: '',
            website: '',
          },
        },
        billing: {
          sameAsCompany: true,
          address: {
            street: '',
            city: '',
            country: '',
          },
        },
      },
      fields: {
        'company.name': {
          validators: (value) => {
            if (!value) return 'Company name is required';
          },
        },
        'company.contact.email': {
          validators: (value) => {
            if (!value) return 'Email is required';
            if (!value.includes('@')) return 'Invalid email';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  // Sync billing address with company address
  useEffect(() => {
    if (state.values.billing.sameAsCompany) {
      form.setValue('billing.address', state.values.company.address);
    }
  }, [state.values.billing.sameAsCompany, state.values.company.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await form.submit(async (values) => {
      const response = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      return response.json();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="company-form">
      <section>
        <h2>Company Information</h2>

        <div className="form-group">
          <label>Company Name</label>
          <input {...form.bind('company.name')} />
          {state.errors['company.name'] && <span className="error">{state.errors['company.name']}</span>}
        </div>

        <div className="form-group">
          <label>Registration Number</label>
          <input {...form.bind('company.registration')} />
        </div>

        <h3>Company Address</h3>
        <div className="form-group">
          <label>Street</label>
          <input {...form.bind('company.address.street')} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input {...form.bind('company.address.city')} />
          </div>

          <div className="form-group">
            <label>Country</label>
            <input {...form.bind('company.address.country')} />
          </div>
        </div>

        <h3>Contact Information</h3>
        <div className="form-group">
          <label>Email</label>
          <input type="email" {...form.bind('company.contact.email')} />
          {state.errors['company.contact.email'] && (
            <span className="error">{state.errors['company.contact.email']}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" {...form.bind('company.contact.phone')} />
          </div>

          <div className="form-group">
            <label>Website</label>
            <input type="url" {...form.bind('company.contact.website')} />
          </div>
        </div>
      </section>

      <section>
        <h2>Billing Address</h2>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={state.values.billing.sameAsCompany}
              onChange={(e) => form.setValue('billing.sameAsCompany', e.target.checked)}
            />
            Same as company address
          </label>
        </div>

        {!state.values.billing.sameAsCompany && (
          <>
            <div className="form-group">
              <label>Street</label>
              <input {...form.bind('billing.address.street')} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input {...form.bind('billing.address.city')} />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input {...form.bind('billing.address.country')} />
              </div>
            </div>
          </>
        )}
      </section>

      <button type="submit" disabled={state.isSubmitting} className="submit-button">
        {state.isSubmitting ? 'Saving...' : 'Save Company'}
      </button>
    </form>
  );
}
```

---

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Usage Guide](./usage.md) - Common patterns and best practices
