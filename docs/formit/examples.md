---
title: Formit — Examples
description: Real-world form patterns and framework integrations for Formit.
---

# Formit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Framework Integration

Complete examples showing how to integrate Formit with different frameworks using custom hooks/composables for reusability.

::: code-group

```tsx [React Hook]
import { useEffect, useState } from 'react';
import { createForm, type FormInit } from '@vielzeug/formit';

function useForm(init: FormInit) {
  const [form] = useState(() => createForm(init));
  const [state, setState] = useState(form.snapshot());

  useEffect(() => form.subscribe(setState), [form]);

  return { form, state };
}

// Usage in component
function LoginForm() {
  const { form, state } = useForm({
    values: {
      email: '',
      password: '',
    },
    rules: {
      email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
      password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (formData) => {
          const response = await fetch('/api/login', {
            method: 'POST',
            body: formData,
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
import { createForm, type FormInit } from '@vielzeug/formit';

export function useForm(init: FormInit) {
  const form = createForm(init);
  const state = ref(form.snapshot());
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
  values: {
    email: '',
    password: '',
  },
  rules: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

const handleSubmit = async () => {
  await form.submit(async (formData) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: formData,
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
  values: {
    email: '',
    password: '',
  },
  rules: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

const state = writable(form.snapshot());
let unsubscribe;

onMount(() => (unsubscribe = form.subscribe((s) => state.set(s))));
onDestroy(() => unsubscribe?.());

async function handleSubmit() {
  await form.submit(async (formData) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: formData,
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

## Login Form

Complete login form with validation and error handling.

```typescript
import { createForm, ValidationError } from '@vielzeug/formit';

const loginForm = createForm({
  values: {
    email: '',
    password: '',
    rememberMe: false,
  },
  rules: {
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
    ],
    password: [
      (v) => (!v ? 'Password is required' : undefined),
      (v) => (v && String(v).length < 8 ? 'Password must be at least 8 characters' : undefined),
    ],
  },
});

// Handle submission
async function handleLogin() {
  try {
    const result = await loginForm.submit(async (formData) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    });

    // Success – redirect or update UI
    console.log('Login successful:', result);
    window.location.href = '/dashboard';
  } catch (error) {
    if (error instanceof ValidationError) {
      // Validation failed — errors are already set on the form
      console.log('Validation errors:', error.errors); // Record<string, string>
    } else {
      // Server error
      console.error('Login failed:', error);
      loginForm.setError('email', 'Invalid credentials');
    }
  }
}
```

## Registration Form

Registration form with async validation and password confirmation.

```typescript
import { createForm } from '@vielzeug/formit';

const registrationForm = createForm({
  values: {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
  rules: {
    username: [
      (v) => (!v ? 'Username is required' : undefined),
      (v) => (v && String(v).length < 3 ? 'Username must be at least 3 characters' : undefined),
      async (v) => {
        if (!v) return;
        const response = await fetch(`/api/check-username?username=${v}`);
        const { exists } = await response.json();
        if (exists) return 'Username is already taken';
      },
    ],
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
    ],
    password: [
      (v) => (!v ? 'Password is required' : undefined),
      (v) => (v && String(v).length < 8 ? 'Min 8 characters' : undefined),
      (v) => (v && !/[A-Z]/.test(String(v)) ? 'Must contain uppercase letter' : undefined),
      (v) => (v && !/[0-9]/.test(String(v)) ? 'Must contain a number' : undefined),
    ],
  },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (values['password'] !== values['confirmPassword']) {
      errors['confirmPassword'] = 'Passwords must match';
    }
    return errors;
  },
});

// Submit
async function handleRegistration() {
  await registrationForm.submit(async (formData) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  });
}
```

## Contact Form with File Upload

Form with file upload and validation.

```typescript
import { createForm } from '@vielzeug/formit';

const contactForm = createForm({
  values: {
    name: '',
    email: '',
    subject: '',
    message: '',
    attachment: null as File | null,
  },
  rules: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
    subject: (v) => (!v ? 'Subject is required' : undefined),
    message: [
      (v) => (!v ? 'Message is required' : undefined),
      (v) => (v && String(v).length < 10 ? 'Message must be at least 10 characters' : undefined),
    ],
    attachment: (v) => {
      if (!v) return; // Optional field
      const file = v as File;
      if (file.size > 5 * 1024 * 1024) return 'File size must be less than 5MB';
      const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowed.includes(file.type)) return 'Only JPEG, PNG, and PDF files are allowed';
    },
  },
});

// Handle file input
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  contactForm.set('attachment', file || null);
}

// Submit
async function handleSubmit() {
  await contactForm.submit(async (formData) => {
    // FormData automatically includes the file
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  });
}
```

## Multi-Step Wizard

Multi-step form with step-by-step validation.

```typescript
import { createForm } from '@vielzeug/formit';

const wizardForm = createForm({
  values: {
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    // Step 2: Address
    street: '',
    city: '',
    zipCode: '',
    // Step 3: Payment
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  },
  rules: {
    firstName: (v) => (!v ? 'First name is required' : undefined),
    lastName: (v) => (!v ? 'Last name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
    street: (v) => (!v ? 'Street is required' : undefined),
    city: (v) => (!v ? 'City is required' : undefined),
    zipCode: [
      (v) => (!v ? 'ZIP code is required' : undefined),
      (v) => (v && !/^\d{5}$/.test(String(v)) ? 'Invalid ZIP code' : undefined),
    ],
    cardNumber: [
      (v) => (!v ? 'Card number is required' : undefined),
      (v) => (v && !/^\d{16}$/.test(String(v).replace(/\s/g, '')) ? 'Invalid card number' : undefined),
    ],
    expiryDate: (v) => (!v ? 'Expiry date is required' : undefined),
    cvv: [
      (v) => (!v ? 'CVV is required' : undefined),
      (v) => (v && !/^\d{3,4}$/.test(String(v)) ? 'Invalid CVV' : undefined),
    ],
  },
});

// Step configuration
const steps = [
  { title: 'Personal Info', fields: ['firstName', 'lastName', 'email'] },
  { title: 'Address', fields: ['street', 'city', 'zipCode'] },
  { title: 'Payment', fields: ['cardNumber', 'expiryDate', 'cvv'] },
];

let currentStep = 0;

// Validate current step
async function validateCurrentStep() {
  const errors = await wizardForm.validateAll({ fields: steps[currentStep].fields });
  return Object.keys(errors).length === 0;
}

// Navigate to next step
async function nextStep() {
  const isValid = await validateCurrentStep();
  if (isValid && currentStep < steps.length - 1) {
    currentStep++;
    updateStepUI();
  }
}

// Submit wizard
async function submitWizard() {
  const isValid = await validateCurrentStep();
  if (isValid) {
    await wizardForm.submit(async (formData) => {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    });
  }
}

function updateStepUI() {
  console.log(`Step ${currentStep + 1}/${steps.length}: ${steps[currentStep].title}`);
}
```

## Dynamic Form Fields

Form with dynamically added/removed fields.

```typescript
import { createForm } from '@vielzeug/formit';

type TeamMember = {
  name: string;
  email: string;
  role: string;
};

const dynamicForm = createForm({
  values: {
    teamName: '',
    members: [] as TeamMember[],
  },
  rules: {
    teamName: (v) => (!v ? 'Team name is required' : undefined),
  },
});

// Add a team member
function addMember() {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  dynamicForm.set('members', [...members, { name: '', email: '', role: 'member' }]);
}

// Remove a team member
function removeMember(index: number) {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  dynamicForm.set('members', members.filter((_, i) => i !== index));
}

// Update a team member
function updateMember(index: number, field: keyof TeamMember, value: string) {
  const members = dynamicForm.get<TeamMember[]>('members') ?? [];
  const updated = [...members];
  updated[index] = { ...updated[index], [field]: value };
  dynamicForm.set('members', updated);
}

// Submit
async function submitTeam() {
  await dynamicForm.submit(async (formData) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: formData.get('teamName'),
        members: dynamicForm.get('members'),
      }),
    });
    return response.json();
  });
}
```

## Search Form with Debounce

Search form with debounced API calls.

```typescript
import { createForm } from '@vielzeug/formit';

const searchForm = createForm({
  values: {
    query: '',
    category: 'all',
    sortBy: 'relevance',
  },
});

let searchTimeout: ReturnType<typeof setTimeout>;

// Subscribe and debounce search
searchForm.subscribe(() => {
  clearTimeout(searchTimeout);

  const query = searchForm.get<string>('query');

  if (!query || query.length < 2) {
    updateResultsUI([]);
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const category = searchForm.get('category');
      const sortBy = searchForm.get('sortBy');

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&category=${category}&sort=${sortBy}`,
      );

      const results = await response.json();
      updateResultsUI(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, 300);
});

function updateResultsUI(results: unknown[]) {
  console.log('Search results:', results);
}
```

## Form with Conditional Fields

Form with fields that show/hide based on other field values.

```typescript
import { createForm } from '@vielzeug/formit';

const profileForm = createForm({
  values: {
    accountType: 'personal' as 'personal' | 'business',
    name: '',
    email: '',
    // Business-only fields
    companyName: '',
    vatNumber: '',
    businessEmail: '',
  },
  rules: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
  },
});

// Conditional validation based on account type
profileForm.subscribe(() => {
  const accountType = profileForm.get<string>('accountType');

  if (accountType === 'business') {
    if (!profileForm.get('companyName')) {
      profileForm.setError('companyName', 'Company name is required');
    } else {
      profileForm.setError('companyName');
    }
    if (!profileForm.get('vatNumber')) {
      profileForm.setError('vatNumber', 'VAT number is required');
    } else {
      profileForm.setError('vatNumber');
    }
    const businessEmail = profileForm.get<string>('businessEmail');
    if (!businessEmail) {
      profileForm.setError('businessEmail', 'Business email is required');
    } else if (!businessEmail.includes('@')) {
      profileForm.setError('businessEmail', 'Invalid email');
    } else {
      profileForm.setError('businessEmail');
    }
  } else {
    profileForm.setError('companyName');
    profileForm.setError('vatNumber');
    profileForm.setError('businessEmail');
  }
});

// Submit
async function submitProfile() {
  await profileForm.submit(async (formData) => {
    const accountType = formData.get('accountType');

    const payload: Record<string, unknown> = {
      accountType,
      name: formData.get('name'),
      email: formData.get('email'),
    };

    if (accountType === 'business') {
      payload['companyName'] = formData.get('companyName');
      payload['vatNumber'] = formData.get('vatNumber');
      payload['businessEmail'] = formData.get('businessEmail');
    }

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.json();
  });
}
```

## Best Practices

### 1. Always Clean Up Subscriptions

```typescript
// ✅ Good – cleanup in useEffect
useEffect(() => {
  const unsubscribe = form.subscribe(setState);
  return unsubscribe; // Cleanup on unmount
}, [form]);

// ❌ Bad – memory leak
form.subscribe(setState);
```

### 2. Use Field Bindings

```tsx
// ✅ Good – one line
<input {...form.bind('email')} />

// ❌ Verbose – manual wiring
<input
  name="email"
  value={form.get('email')}
  onChange={(e) => form.set('email', e.target.value)}
  onBlur={() => form.setTouched('email')}
/>
```

### 3. Handle Validation Errors

```typescript
// ✅ Good – proper error handling
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    for (const [field, message] of Object.entries(error.errors)) {
      console.log(`${field}: ${message}`);
    }
  } else {
    console.error('Submit failed:', error);
  }
}
```

### 4. Show Errors Only When Touched

```tsx
// ✅ Good – only show after user interaction
{state.touched.has('email') && state.errors['email'] && (
  <span>{state.errors['email']}</span>
)}

// ❌ Bad – shows immediately on page load
{state.errors['email'] && <span>{state.errors['email']}</span>}
```

### 5. Use `isValid` / `isDirty` / `isTouched` Flags

```typescript
// ✅ Good – use computed flags
if (state.isValid) { /* ... */ }
if (state.isDirty) { /* warn before leaving */ }

// ❌ Verbose – manual checks
if (Object.keys(state.errors).length === 0) { /* ... */ }
if (state.dirty.size > 0) { /* ... */ }
```

## See Also

- [API Reference](./api.md) – Complete API documentation
- [Usage Guide](./usage.md) – Common patterns and best practices
