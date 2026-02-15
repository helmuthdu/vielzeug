# Examples

Real-world examples demonstrating common use cases and patterns with Formit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

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
    fields: {
      email: {
        value: '',
        validators: (v) => !String(v).includes('@') && 'Invalid email',
      },
      password: {
        value: '',
        validators: (v) => String(v).length < 8 && 'Min 8 characters',
      },
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
        {state.errors.get('email') && <span className="error">{state.errors.get('email')}</span>}
      </div>

      <div>
        <input {...form.bind('password')} type="password" placeholder="Password" />
        {state.errors.get('password') && <span className="error">{state.errors.get('password')}</span>}
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
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
    password: {
      value: '',
      validators: (v) => String(v).length < 8 && 'Min 8 characters',
    },
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
      <span v-if="state.errors.get('email')" class="error">
        {{ state.errors.get('email') }}
      </span>
    </div>

    <div>
      <input v-bind="form.bind('password')" type="password" placeholder="Password" />
      <span v-if="state.errors.get('password')" class="error">
        {{ state.errors.get('password') }}
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
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email'
    },
    password: {
      value: '',
      validators: (v) => String(v).length < 8 && 'Min 8 characters'
    }
  }
});

const state = writable(form.snapshot());
let unsubscribe;

onMount(() => unsubscribe = form.subscribe(s => state.set(s)));
onDestroy(() => unsubscribe?.());

async function handleSubmit() {
  await form.submit(async (formData) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: formData
    });
    return response.json();
  });
}
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div>
    <input {...form.bind('email')} type="email" placeholder="Email" />
    {#if $state.errors.get('email')}
      <span class="error">{$state.errors.get('email')}</span>
    {/if}
  </div>

  <div>
    <input {...form.bind('password')} type="password" placeholder="Password" />
    {#if $state.errors.get('password')}
      <span class="error">{$state.errors.get('password')}</span>
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
  fields: {
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email format'],
    },
    password: {
      value: '',
      validators: [
        (v) => !v && 'Password is required',
        (v) => v && String(v).length < 8 && 'Password must be at least 8 characters',
      ],
    },
    rememberMe: false,
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

    // Success - redirect or update UI
    console.log('Login successful:', result);
    window.location.href = '/dashboard';
  } catch (error) {
    if (error instanceof ValidationError) {
      // Validation failed
      console.log('Validation errors:', error.errors);
    } else {
      // Server error
      console.error('Login failed:', error);
      loginForm.error('email', 'Invalid credentials');
    }
  }
}
```

## Registration Form

Registration form with async validation and password confirmation.

```typescript
import { createForm } from '@vielzeug/formit';

const registrationForm = createForm({
  fields: {
    username: {
      value: '',
      validators: [
        (v) => !v && 'Username is required',
        (v) => v && String(v).length < 3 && 'Username must be at least 3 characters',
        async (v) => {
          if (!v) return;

          // Async validation - check if username exists
          const response = await fetch(`/api/check-username?username=${v}`);
          const { exists } = await response.json();

          if (exists) return 'Username is already taken';
        },
      ],
    },
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email format'],
    },
    password: {
      value: '',
      validators: [
        (v) => !v && 'Password is required',
        (v) => v && String(v).length < 8 && 'Min 8 characters',
        (v) => v && !/[A-Z]/.test(String(v)) && 'Must contain uppercase letter',
        (v) => v && !/[0-9]/.test(String(v)) && 'Must contain a number',
      ],
    },
    confirmPassword: '',
  },
  validate: (formData) => {
    const errors = new Map();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      errors.set('confirmPassword', 'Passwords must match');
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
  fields: {
    name: {
      value: '',
      validators: (v) => !v && 'Name is required',
    },
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email'],
    },
    subject: {
      value: '',
      validators: (v) => !v && 'Subject is required',
    },
    message: {
      value: '',
      validators: [
        (v) => !v && 'Message is required',
        (v) => v && String(v).length < 10 && 'Message must be at least 10 characters',
      ],
    },
    attachment: {
      value: null,
      validators: (v) => {
        if (!v) return; // Optional field

        const file = v as File;
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (file.size > maxSize) return 'File size must be less than 5MB';

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          return 'Only JPEG, PNG, and PDF files are allowed';
        }
      },
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
  fields: {
    // Step 1: Personal Info
    firstName: {
      value: '',
      validators: (v) => !v && 'First name is required',
    },
    lastName: {
      value: '',
      validators: (v) => !v && 'Last name is required',
    },
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email'],
    },

    // Step 2: Address
    street: {
      value: '',
      validators: (v) => !v && 'Street is required',
    },
    city: {
      value: '',
      validators: (v) => !v && 'City is required',
    },
    zipCode: {
      value: '',
      validators: [(v) => !v && 'ZIP code is required', (v) => v && !/^\d{5}$/.test(String(v)) && 'Invalid ZIP code'],
    },

    // Step 3: Payment
    cardNumber: {
      value: '',
      validators: [
        (v) => !v && 'Card number is required',
        (v) => v && !/^\d{16}$/.test(String(v).replace(/\s/g, '')) && 'Invalid card number',
      ],
    },
    expiryDate: {
      value: '',
      validators: (v) => !v && 'Expiry date is required',
    },
    cvv: {
      value: '',
      validators: [(v) => !v && 'CVV is required', (v) => v && !/^\d{3,4}$/.test(String(v)) && 'Invalid CVV'],
    },
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
  const stepFields = steps[currentStep].fields;
  const errors = await wizardForm.validate({ fields: stepFields });
  return errors.size === 0;
}

// Navigate to next step
async function nextStep() {
  const isValid = await validateCurrentStep();
  if (isValid && currentStep < steps.length - 1) {
    currentStep++;
    updateStepUI();
  }
}

// Navigate to previous step
function previousStep() {
  if (currentStep > 0) {
    currentStep--;
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
  fields: {
    teamName: {
      value: '',
      validators: (v) => !v && 'Team name is required',
    },
    members: [] as TeamMember[],
  },
});

// Add a team member
function addMember() {
  const members = dynamicForm.get('members') || [];
  dynamicForm.set('members', [...members, { name: '', email: '', role: 'member' }]);
}

// Remove a team member
function removeMember(index: number) {
  const members = dynamicForm.get('members') || [];
  dynamicForm.set(
    'members',
    members.filter((_, i) => i !== index),
  );
}

// Update a team member
function updateMember(index: number, field: keyof TeamMember, value: string) {
  const members = dynamicForm.get('members') || [];
  const updated = [...members];
  updated[index] = { ...updated[index], [field]: value };
  dynamicForm.set('members', updated);
}

// Validate members
dynamicForm.subscribe((state) => {
  const members = dynamicForm.get('members') || [];

  // Clear previous member errors
  for (let i = 0; i < members.length; i++) {
    dynamicForm.error(`members.${i}.name`, '');
    dynamicForm.error(`members.${i}.email`, '');
  }

  // Validate each member
  members.forEach((member, index) => {
    if (!member.name) {
      dynamicForm.error(`members.${index}.name`, 'Name is required');
    }
    if (!member.email) {
      dynamicForm.error(`members.${index}.email`, 'Email is required');
    } else if (!member.email.includes('@')) {
      dynamicForm.error(`members.${index}.email`, 'Invalid email');
    }
  });
});

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
  fields: {
    query: '',
    category: 'all',
    sortBy: 'relevance',
  },
});

let searchTimeout: ReturnType<typeof setTimeout>;
let searchResults: any[] = [];

// Subscribe and debounce search
searchForm.subscribe((state) => {
  clearTimeout(searchTimeout);

  const query = searchForm.get('query');

  if (!query || String(query).length < 2) {
    searchResults = [];
    updateResultsUI([]);
    return;
  }

  // Debounce: wait 300ms after last keystroke
  searchTimeout = setTimeout(async () => {
    try {
      const category = searchForm.get('category');
      const sortBy = searchForm.get('sortBy');

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(String(query))}&category=${category}&sort=${sortBy}`,
      );

      searchResults = await response.json();
      updateResultsUI(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, 300);
});

function updateResultsUI(results: any[]) {
  console.log('Search results:', results);
  // Update your UI with results
}
```

## Form with Conditional Fields

Form with fields that show/hide based on other field values.

```typescript
import { createForm } from '@vielzeug/formit';

const profileForm = createForm({
  fields: {
    accountType: 'personal', // 'personal' or 'business'
    name: {
      value: '',
      validators: (v) => !v && 'Name is required',
    },
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email'],
    },
    // Business-only fields
    companyName: '',
    vatNumber: '',
    businessEmail: '',
  },
});

// Conditional validation based on account type
profileForm.subscribe((state) => {
  const accountType = profileForm.get('accountType');

  if (accountType === 'business') {
    // Validate business fields
    if (!profileForm.get('companyName')) {
      profileForm.error('companyName', 'Company name is required');
    } else {
      profileForm.error('companyName', '');
    }

    if (!profileForm.get('vatNumber')) {
      profileForm.error('vatNumber', 'VAT number is required');
    } else {
      profileForm.error('vatNumber', '');
    }

    const businessEmail = profileForm.get('businessEmail');
    if (!businessEmail) {
      profileForm.error('businessEmail', 'Business email is required');
    } else if (!String(businessEmail).includes('@')) {
      profileForm.error('businessEmail', 'Invalid email');
    } else {
      profileForm.error('businessEmail', '');
    }
  } else {
    // Clear business field errors for personal accounts
    profileForm.error('companyName', '');
    profileForm.error('vatNumber', '');
    profileForm.error('businessEmail', '');
  }
});

// Submit
async function submitProfile() {
  await profileForm.submit(async (formData) => {
    const accountType = formData.get('accountType');

    // Build payload based on account type
    const payload: any = {
      accountType,
      name: formData.get('name'),
      email: formData.get('email'),
    };

    if (accountType === 'business') {
      payload.companyName = formData.get('companyName');
      payload.vatNumber = formData.get('vatNumber');
      payload.businessEmail = formData.get('businessEmail');
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
// ✅ Good - cleanup in useEffect
useEffect(() => {
  const unsubscribe = form.subscribe(setState);
  return unsubscribe; // Cleanup on unmount
}, [form]);

// ❌ Bad - memory leak
form.subscribe(setState);
```

### 2. Use Field Bindings

```tsx
// ✅ Good - one line
<input {...form.bind('email')} />

// ❌ Verbose - manual wiring
<input
  name="email"
  value={form.get('email')}
  onChange={(e) => form.set('email', e.target.value)}
  onBlur={() => form.touch('email', true)}
/>
```

### 3. Handle Validation Errors

```typescript
// ✅ Good - proper error handling
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    // Show validation errors
    for (const [field, message] of error.errors) {
      console.log(`${field}: ${message}`);
    }
  } else {
    // Handle other errors
    console.error('Submit failed:', error);
  }
}
```

### 4. Show Errors Only When Touched

```tsx
// ✅ Good - only show after user interaction
{
  state.touched.has('email') && state.errors.get('email') && <span>{state.errors.get('email')}</span>;
}

// ❌ Bad - shows immediately
{
  state.errors.get('email') && <span>{state.errors.get('email')}</span>;
}
```

### 5. Use Nested Objects for Organization

```typescript
// ✅ Good - organized structure
fields: {
  user: {
    name: '',
    email: ''
  },
  address: {
    street: '',
    city: ''
  }
}

// Access with dot notation
form.get('user.name')
form.get('address.city')
```

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Usage Guide](./usage.md) - Common patterns and best practices
