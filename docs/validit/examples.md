# Validit Examples

Real-world examples showing how to use Validit in different scenarios.

::: tip 💡 Prerequisites
This page assumes you've read the [Usage Guide](./usage.md). Examples focus on practical applications rather than API basics.
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

Complete examples showing how to integrate Validit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a schema within components.

::: code-group

```tsx [React]
import { v } from '@vielzeug/validit';
import { useState } from 'react';

const userSchema = v.object({
  name: v.string().min(1, 'Name is required'),
  email: v.email('Invalid email'),
});

function UserForm() {
  const [state, setState] = useState({
    data: { name: '', email: '' },
    errors: {} as Record<string, string>,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = userSchema.safeParse(state.data);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      setState((prev) => ({ ...prev, errors }));
      return;
    }

    console.log('Valid data:', result.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={state.data.name}
        onChange={(e) =>
          setState((prev) => ({
            ...prev,
            data: { ...prev.data, name: e.target.value },
          }))
        }
        placeholder="Name"
      />
      {state.errors.name && <span>{state.errors.name}</span>}

      <input
        value={state.data.email}
        onChange={(e) =>
          setState((prev) => ({
            ...prev,
            data: { ...prev.data, email: e.target.value },
          }))
        }
        placeholder="Email"
      />
      {state.errors.email && <span>{state.errors.email}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { v } from '@vielzeug/validit';
import { reactive } from 'vue';

const userSchema = v.object({
  name: v.string().min(1, 'Name is required'),
  email: v.email('Invalid email'),
});

const state = reactive({
  data: { name: '', email: '' },
  errors: {} as Record<string, string>,
});

const handleSubmit = (e: Event) => {
  e.preventDefault();
  const result = userSchema.safeParse(state.data);

  if (!result.success) {
    state.errors = {};
    result.error.issues.forEach((issue) => {
      state.errors[issue.path.join('.')] = issue.message;
    });
    return;
  }

  console.log('Valid data:', result.data);
};
</script>

<template>
  <form @submit="handleSubmit">
    <input v-model="state.data.name" placeholder="Name" />
    <span v-if="state.errors.name">{{ state.errors.name }}</span>

    <input v-model="state.data.email" placeholder="Email" />
    <span v-if="state.errors.email">{{ state.errors.email }}</span>

    <button type="submit">Submit</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { v } from '@vielzeug/validit';

  const userSchema = v.object({
    name: v.string().min(1, 'Name is required'),
    email: v.email('Invalid email'),
  });

  let state = {
    data: { name: '', email: '' },
    errors: {} as Record<string, string>,
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const result = userSchema.safeParse(state.data);

    if (!result.success) {
      state.errors = {};
      result.error.issues.forEach((issue) => {
        state.errors[issue.path.join('.')] = issue.message;
      });
      return;
    }

    console.log('Valid data:', result.data);
  };
</script>

<form on:submit={handleSubmit}>
  <input
    bind:value={state.data.name}
    placeholder="Name"
  />
  {#if state.errors.name}
    <span>{state.errors.name}</span>
  {/if}

  <input
    bind:value={state.data.email}
    placeholder="Email"
  />
  {#if state.errors.email}
    <span>{state.errors.email}</span>
  {/if}

  <button type="submit">Submit</button>
</form>
```

```ts [Web Component]
import { v } from '@vielzeug/validit';

class UserForm extends HTMLElement {
  #schema = v.object({
    name: v.string().min(1, 'Name is required'),
    email: v.email('Invalid email'),
  });

  connectedCallback() {
    this.innerHTML = `
      <form>
        <input name="name" placeholder="Name">
        <span id="error-name" style="color: red;"></span>
        
        <input name="email" placeholder="Email">
        <span id="error-email" style="color: red;"></span>
        
        <button type="submit">Submit</button>
      </form>
    `;

    this.querySelector('form')!.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: (this.querySelector('input[name="name"]') as HTMLInputElement).value,
        email: (this.querySelector('input[name="email"]') as HTMLInputElement).value,
      };

      const result = this.#schema.safeParse(data);

      if (!result.success) {
        this.querySelector('#error-name')!.textContent = '';
        this.querySelector('#error-email')!.textContent = '';
        result.error.issues.forEach((issue) => {
          const field = issue.path.join('.');
          const el = this.querySelector(`#error-${field}`);
          if (el) el.textContent = issue.message;
        });
        return;
      }

      console.log('Valid data:', result.data);
    };
  }
}

customElements.define('user-form', UserForm);
```

:::

### Advanced Integration (Hook/Composable)

Recommended pattern for reusability and separation of concerns.

::: code-group

```tsx [React]
// useFormValidation.ts
import { v, type Schema } from '@vielzeug/validit';
import { useState } from 'react';

export function useFormValidation<T extends Record<string, any>>(schema: Schema<T>) {
  const [state, setState] = useState({
    data: {} as T,
    errors: {} as Record<string, string>,
  });

  const handleChange = (field: keyof T, value: any) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  };

  const handleSubmit = (onSubmit: (data: T) => void) => {
    return (e: React.FormEvent) => {
      e.preventDefault();
      const result = schema.safeParse(state.data);

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          errors[issue.path.join('.')] = issue.message;
        });
        setState((prev) => ({ ...prev, errors }));
        return;
      }

      onSubmit(result.data);
    };
  };

  return { state, handleChange, handleSubmit };
}

// UserForm.tsx
const userSchema = v.object({
  name: v.string().min(1, 'Name is required'),
  email: v.email('Invalid email'),
});

function UserForm() {
  const { state, handleChange, handleSubmit } = useFormValidation(userSchema);

  return (
    <form onSubmit={handleSubmit((data) => console.log('Submitted:', data))}>
      <input value={state.data.name || ''} onChange={(e) => handleChange('name', e.target.value)} placeholder="Name" />
      {state.errors.name && <span>{state.errors.name}</span>}

      <input
        value={state.data.email || ''}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="Email"
      />
      {state.errors.email && <span>{state.errors.email}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

```vue [Vue 3]
// useFormValidation.ts
import { v, type Schema } from '@vielzeug/validit';
import { reactive } from 'vue';

export function useFormValidation<T extends Record<string, any>>(schema: Schema<T>) {
  const state = reactive({
    data: {} as T,
    errors: {} as Record<string, string>,
  });

  const handleChange = (field: keyof T, value: any) => {
    state.data[field] = value;
  };

  const handleSubmit = (onSubmit: (data: T) => void) => {
    return (e: Event) => {
      e.preventDefault();
      const result = schema.safeParse(state.data);

      if (!result.success) {
        state.errors = {};
        result.error.issues.forEach((issue) => {
          state.errors[issue.path.join('.')] = issue.message;
        });
        return;
      }

      onSubmit(result.data);
    };
  };

  return { state, handleChange, handleSubmit };
}

// UserForm.vue
<script setup lang="ts">
const userSchema = v.object({
  name: v.string().min(1, 'Name is required'),
  email: v.email('Invalid email'),
});

const { state, handleChange, handleSubmit } = useFormValidation(userSchema);
</script>

<template>
  <form @submit="handleSubmit((data) => console.log('Submitted:', data))">
    <input
      :value="state.data.name || ''"
      @input="(e) => handleChange('name', (e.target as HTMLInputElement).value)"
      placeholder="Name"
    />
    <span v-if="state.errors.name">{{ state.errors.name }}</span>

    <input
      :value="state.data.email || ''"
      @input="(e) => handleChange('email', (e.target as HTMLInputElement).value)"
      placeholder="Email"
    />
    <span v-if="state.errors.email">{{ state.errors.email }}</span>

    <button type="submit">Submit</button>
  </form>
</template>
```

```svelte [Svelte]
// formStore.ts
import { v, type Schema } from '@vielzeug/validit';
import { writable } from 'svelte/store';

export function createFormValidation<T extends Record<string, any>>(schema: Schema<T>) {
  const state = writable({
    data: {} as T,
    errors: {} as Record<string, string>,
  });

  const handleChange = (field: keyof T, value: any) => {
    state.update((s) => ({
      ...s,
      data: { ...s.data, [field]: value },
    }));
  };

  const handleSubmit = (onSubmit: (data: T) => void) => {
    return (e: Event) => {
      e.preventDefault();
      let currentState: any;
      state.subscribe((s) => (currentState = s))();

      const result = schema.safeParse(currentState.data);

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          errors[issue.path.join('.')] = issue.message;
        });
        state.update((s) => ({ ...s, errors }));
        return;
      }

      onSubmit(result.data);
    };
  };

  return { state, handleChange, handleSubmit };
}

// +page.svelte
<script lang="ts">
  import { createFormValidation } from './formStore';
  import { v } from '@vielzeug/validit';

  const userSchema = v.object({
    name: v.string().min(1, 'Name is required'),
    email: v.email('Invalid email'),
  });

  const { state, handleChange, handleSubmit } = createFormValidation(userSchema);
</script>

<form on:submit={handleSubmit((data) => console.log('Submitted:', data))}>
  <input
    value={$state.data.name || ''}
    on:input={(e) => handleChange('name', e.currentTarget.value)}
    placeholder="Name"
  />
  {#if $state.errors.name}
    <span>{$state.errors.name}</span>
  {/if}

  <input
    value={$state.data.email || ''}
    on:input={(e) => handleChange('email', e.currentTarget.value)}
    placeholder="Email"
  />
  {#if $state.errors.email}
    <span>{$state.errors.email}</span>
  {/if}

  <button type="submit">Submit</button>
</form>
```

```ts [Web Component]
// BaseValidatedForm.ts
import { v, type Schema } from '@vielzeug/validit';

export class BaseValidatedForm<T extends Record<string, any>> extends HTMLElement {
  schema: Schema<T>;

  constructor(schema: Schema<T>) {
    super();
    this.schema = schema;
  }

  validate(data: unknown): T | null {
    const result = this.schema.safeParse(data);

    if (!result.success) {
      this.displayErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return null;
    }

    return result.data;
  }

  displayErrors(errors: Record<string, string>) {
    Object.entries(errors).forEach(([field, message]) => {
      const el = this.querySelector(`[data-error="${field}"]`);
      if (el) el.textContent = message;
    });
  }

  clearErrors() {
    this.querySelectorAll('[data-error]').forEach((el) => {
      el.textContent = '';
    });
  }
}
```

:::

## Form Validation

### User Registration

Complete registration form with all common validations.

```ts
import { v, type Infer } from '@vielzeug/validit';

const registrationSchema = v
  .object({
    username: v
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .pattern(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .required('Username is required'),

    email: v.email().required('Email is required'),

    password: v
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
      .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
      .refine((val) => /[0-9]/.test(val), 'Password must contain at least one number')
      .refine((val) => /[!@#$%^&*]/.test(val), 'Password must contain at least one special character')
      .required('Password is required'),

    confirmPassword: v.string().required('Please confirm your password'),

    age: v
      .number()
      .int('Age must be a whole number')
      .min(13, 'You must be at least 13 years old')
      .max(120, 'Please enter a valid age')
      .required('Age is required'),

    agreeToTerms: v
      .boolean()
      .refine((val) => val === true, 'You must accept the terms and conditions')
      .required(),

    newsletter: v.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, 'Passwords must match');

type RegistrationData = Infer<typeof registrationSchema>;

// Usage
function handleRegistration(formData: unknown) {
  const result = registrationSchema.safeParse(formData);

  if (!result.success) {
    // Show validation errors
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      showError(field, issue.message);
    });
    return;
  }

  // Submit valid data
  submitRegistration(result.data);
}
```

### Login Form

Simple login with async username/email check.

```ts
const loginSchema = v.object({
  identifier: v
    .string()
    .min(1, 'Email or username is required')
    .refineAsync(async (value) => {
      // Check if user exists
      const user = await findUser(value);
      return user !== null;
    }, 'User not found')
    .required(),

  password: v.string().min(1, 'Password is required').required(),

  rememberMe: v.boolean().default(false),
});

async function handleLogin(formData: unknown) {
  const result = await loginSchema.safeParseAsync(formData);

  if (result.success) {
    await authenticate(result.data);
  }
}
```

### Profile Update

Nested object validation with optional fields.

```ts
const profileSchema = v.object({
  personal: v.object({
    firstName: v.string().min(1).max(50).required(),
    lastName: v.string().min(1).max(50).required(),
    bio: v.string().max(500).optional(),
    birthdate: v.date().max(new Date()).optional(),
  }),

  contact: v.object({
    email: v.email().required(),
    phone: v
      .string()
      .pattern(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
      .optional(),
    address: v
      .object({
        street: v.string().optional(),
        city: v.string().optional(),
        country: v.string().optional(),
        zipCode: v
          .string()
          .pattern(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
          .optional(),
      })
      .optional(),
  }),

  social: v
    .object({
      twitter: v.url().optional(),
      linkedin: v.url().optional(),
      github: v.url().optional(),
    })
    .optional(),
});

type Profile = Infer<typeof profileSchema>;
```

## API Validation

### Request Body Validation

Validate incoming API requests.

```ts
// POST /api/articles
const createArticleSchema = v.object({
  title: v
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .required(),

  content: v.string().min(50, 'Content must be at least 50 characters').required(),

  tags: v.array(v.string()).min(1, 'At least one tag is required').max(5, 'Maximum 5 tags allowed'),

  status: v.oneOf('draft', 'published', 'archived').default('draft'),

  publishedAt: v.date().optional(),
});

// Express middleware
app.post('/api/articles', async (req, res) => {
  const result = createArticleSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const article = await db.articles.create(result.data);
  res.json(article);
});
```

### Response Validation

Validate API responses for type safety.

```ts
const userResponseSchema = v.object({
  success: v.boolean(),
  data: v.object({
    id: v.positiveInt(),
    username: v.string(),
    email: v.email(),
    avatar: v.url().optional(),
    createdAt: v.string(), // ISO date string
  }),
  meta: v
    .object({
      timestamp: v.number(),
      version: v.string(),
    })
    .optional(),
});

type UserResponse = Infer<typeof userResponseSchema>;

async function fetchUser(id: number): Promise<UserResponse> {
  const response = await fetch(`/api/users/${id}`);
  const json = await response.json();

  // Validate response
  return userResponseSchema.parse(json);
}
```

### Query Parameters

Validate URL query parameters with coercion.

```ts
const searchQuerySchema = v
  .object({
    q: v.string().min(1, 'Search query is required').required(),

    page: v.coerce.number().int().positive().default(1),

    limit: v.coerce.number().int().min(1).max(100).default(20),

    sort: v.oneOf('relevance', 'date', 'popularity').default('relevance'),

    category: v.oneOf('all', 'tech', 'science', 'business', 'sports').default('all'),

    minPrice: v.coerce.number().positive().optional(),
    maxPrice: v.coerce.number().positive().optional(),
  })
  .refine((data) => {
    if (data.minPrice && data.maxPrice) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  }, 'Minimum price must be less than maximum price');

// Express route
app.get('/api/search', (req, res) => {
  const result = searchQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }

  const results = performSearch(result.data);
  res.json(results);
});
```

## Configuration Validation

### Application Config

Validate environment variables and config files.

```ts
const appConfigSchema = v.object({
  server: v.object({
    port: v
      .number()
      .int()
      .min(1024, 'Port must be at least 1024')
      .max(65535, 'Port must be at most 65535')
      .default(3000),

    host: v.string().default('localhost'),

    cors: v.object({
      enabled: v.boolean().default(true),
      origins: v.array(v.string()).default(['*']),
    }),
  }),

  database: v.object({
    url: v.string().required('Database URL is required'),

    poolSize: v.number().int().positive().default(10),

    ssl: v.boolean().default(false),
  }),

  cache: v.object({
    enabled: v.boolean().default(true),
    ttl: v.number().int().positive().default(3600),
    redis: v
      .object({
        host: v.string(),
        port: v.number().int(),
        password: v.string().optional(),
      })
      .optional(),
  }),

  logging: v.object({
    level: v.oneOf('debug', 'info', 'warn', 'error').default('info'),
    format: v.oneOf('json', 'pretty').default('json'),
  }),

  features: v.object({
    authentication: v.boolean().default(true),
    rateLimit: v.boolean().default(true),
    analytics: v.boolean().default(false),
  }),
});

type AppConfig = Infer<typeof appConfigSchema>;

// Load and validate config
function loadConfig(): AppConfig {
  const config = {
    server: {
      port: Number(process.env.PORT) || undefined,
      host: process.env.HOST,
      cors: {
        enabled: process.env.CORS_ENABLED === 'true',
        origins: process.env.CORS_ORIGINS?.split(','),
      },
    },
    database: {
      url: process.env.DATABASE_URL,
      poolSize: Number(process.env.DB_POOL_SIZE) || undefined,
      ssl: process.env.DB_SSL === 'true',
    },
    // ... rest of config
  };

  return appConfigSchema.parse(config);
}
```

## E-commerce Examples

### Product Schema

```ts
const productSchema = v.object({
  id: v.uuid(),
  name: v.string().min(1).max(200).required(),
  description: v.string().max(2000).optional(),

  price: v.object({
    amount: v.number().positive().required(),
    currency: v.oneOf('USD', 'EUR', 'GBP').default('USD'),
  }),

  inventory: v.object({
    quantity: v.number().int().min(0).required(),
    lowStockThreshold: v.number().int().positive().default(10),
  }),

  categories: v.array(v.string()).min(1).max(3),
  tags: v.array(v.string()).max(10).optional(),

  images: v
    .array(
      v.object({
        url: v.url(),
        alt: v.string().optional(),
        isPrimary: v.boolean().default(false),
      }),
    )
    .min(1)
    .max(5),

  variants: v
    .array(
      v.object({
        id: v.uuid(),
        name: v.string(),
        sku: v.string().pattern(/^[A-Z0-9-]+$/),
        price: v.number().positive(),
        stock: v.number().int().min(0),
      }),
    )
    .optional(),

  published: v.boolean().default(false),
  publishedAt: v.date().optional(),
});

type Product = Infer<typeof productSchema>;
```

### Order Schema

```ts
const orderSchema = v
  .object({
    customer: v.object({
      id: v.uuid().required(),
      email: v.email().required(),
      name: v.string().required(),
    }),

    items: v
      .array(
        v.object({
          productId: v.uuid(),
          variantId: v.uuid().optional(),
          quantity: v.number().int().positive(),
          price: v.number().positive(),
        }),
      )
      .min(1, 'Order must contain at least one item'),

    shipping: v.object({
      address: v.object({
        street: v.string().required(),
        city: v.string().required(),
        state: v.string().required(),
        zipCode: v.string().pattern(/^\d{5}(-\d{4})?$/),
        country: v.string().required(),
      }),
      method: v.oneOf('standard', 'express', 'overnight'),
      tracking: v.string().optional(),
    }),

    payment: v.object({
      method: v.oneOf('credit_card', 'paypal', 'bank_transfer'),
      status: v.oneOf('pending', 'completed', 'failed'),
      transactionId: v.string().optional(),
    }),

    totals: v.object({
      subtotal: v.number().positive(),
      tax: v.number().min(0),
      shipping: v.number().min(0),
      discount: v.number().min(0).default(0),
      total: v.number().positive(),
    }),
  })
  .refine((data) => {
    const calculated = data.totals.subtotal + data.totals.tax + data.totals.shipping - data.totals.discount;

    return Math.abs(calculated - data.totals.total) < 0.01;
  }, 'Total amount calculation is incorrect');

type Order = Infer<typeof orderSchema>;
```

## Async Validation Examples

### Username Availability

Check username availability against database.

```ts
const usernameSchema = v
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username cannot exceed 20 characters')
  .pattern(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refineAsync(async (username) => {
    const user = await db.users.findOne({ username });
    return user === null;
  }, 'Username is already taken');

// Usage
async function checkUsername(username: string) {
  const result = await usernameSchema.safeParseAsync(username);

  if (result.success) {
    return { available: true };
  }

  return {
    available: false,
    errors: result.error.issues.map((i) => i.message),
  };
}
```

### Email Domain Validation

Validate email and check domain MX records.

```ts
import { resolveMx } from 'dns/promises';

const emailSchema = v.email().refineAsync(async (email) => {
  const domain = email.split('@')[1];
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}, 'Email domain does not exist or has no mail servers');

// Usage
const result = await emailSchema.safeParseAsync('user@invalid-domain.xyz');
```

### API Key Validation

Verify API key against external service.

```ts
const apiKeySchema = v
  .string()
  .pattern(/^sk_[a-zA-Z0-9]{32}$/, 'Invalid API key format')
  .refineAsync(async (key) => {
    const response = await fetch('https://api.service.com/validate', {
      headers: { Authorization: `Bearer ${key}` },
    });
    return response.ok;
  }, 'Invalid or expired API key');
```


## Union & Discriminated Unions

### API Response Union

```ts
const successResponseSchema = v.object({
  success: v.literal(true),
  data: v.object({
    id: v.number(),
    name: v.string(),
  }),
});

const errorResponseSchema = v.object({
  success: v.literal(false),
  error: v.object({
    code: v.string(),
    message: v.string(),
  }),
});

const apiResponseSchema = v.union(successResponseSchema, errorResponseSchema);

type ApiResponse = Infer<typeof apiResponseSchema>;
// { success: true; data: {...} } | { success: false; error: {...} }

// Usage with type narrowing
function handleResponse(response: ApiResponse) {
  if (response.success) {
    console.log(response.data); // Type-safe access
  } else {
    console.error(response.error); // Type-safe access
  }
}
```

### Payment Method Union

```ts
const creditCardSchema = v.object({
  type: v.literal('credit_card'),
  cardNumber: v.string().pattern(/^\d{16}$/),
  expiryMonth: v.number().int().min(1).max(12),
  expiryYear: v.number().int(),
  cvv: v.string().pattern(/^\d{3,4}$/),
});

const paypalSchema = v.object({
  type: v.literal('paypal'),
  email: v.email(),
});

const bankTransferSchema = v.object({
  type: v.literal('bank_transfer'),
  accountNumber: v.string(),
  routingNumber: v.string(),
  accountType: v.oneOf('checking', 'savings'),
});

const paymentMethodSchema = v.union(creditCardSchema, paypalSchema, bankTransferSchema);

type PaymentMethod = Infer<typeof paymentMethodSchema>;
```

## Advanced Patterns

### Recursive Schema (Comments)

```ts
type Comment = {
  id: number;
  text: string;
  author: string;
  replies?: Comment[];
};

const commentSchema: v.Schema<Comment> = v.object({
  id: v.positiveInt(),
  text: v.string().min(1).max(1000),
  author: v.string(),
  replies: v.array(v.any()).optional(), // Simplified for recursion
}) as any;
```

### Conditional Validation

```ts
const shipmentSchema = v
  .object({
    shippingMethod: v.oneOf('pickup', 'delivery'),
    address: v
      .object({
        street: v.string(),
        city: v.string(),
        zipCode: v.string(),
      })
      .optional(),
  })
  .refine((data) => {
    if (data.shippingMethod === 'delivery') {
      return data.address !== undefined;
    }
    return true;
  }, 'Address is required for delivery');
```

### Transform & Normalize

```ts
const userInputSchema = v.object({
  email: v
    .string()
    .transform((s) => s.trim().toLowerCase())
    .email(),

  tags: v
    .string()
    .transform((s) => s.split(',').map((tag) => tag.trim()))
    .default(''),

  acceptedTerms: v
    .string()
    .transform((s) => s === 'true' || s === '1')
    .refine((val) => val === true, 'Must accept terms'),
});

// Input: { email: '  USER@EXAMPLE.COM  ', tags: 'tech, javascript, nodejs' }
// Output: { email: 'user@example.com', tags: ['tech', 'javascript', 'nodejs'] }
```

## Testing Examples

### Unit Testing Schemas

```ts
import { describe, it, expect } from 'vitest';

describe('userSchema', () => {
  it('should accept valid user', () => {
    const validUser = {
      username: 'john_doe',
      email: 'john@example.com',
      age: 25,
    };

    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      username: 'john_doe',
      email: 'invalid-email',
      age: 25,
    };

    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['email'],
          code: 'invalid_email',
        }),
      );
    }
  });
});
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./usage">Usage Guide</a> - Comprehensive usage patterns</li>
    </ul>
  </div>
</div>
