---
title: Formit - Usage Guide
description: Fields, validation, submission, subscriptions, bind, reset, and advanced patterns for Formit.
---

[[toc]]

## Basic Usage

```ts
const form = createForm({
  defaultValues: {
    email: '',
    password: '',
    profile: { age: 0, name: '' },
  },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

form.set('profile.age', 30);
form.set('profile.name', 'Alice');

const email = form.get('email');
const values = form.values();
```

## Typed Paths

Formit is path-typed first. Prefer a concrete values shape so field paths and value types are inferred.

```ts
type Values = {
  email: string;
  profile: { age: number; name: string };
};

const form = createForm<Values>({
  defaultValues: { email: '', profile: { age: 0, name: '' } },
});

form.set('profile.age', 42);
```

Dynamic shape escape hatch:

```ts
const dynamicForm = createForm<Record<string, unknown>>({});
dynamicForm.set('custom.field', 'value');
```

## Validation

```ts
await form.validateField('password');
await form.validateAll();
await form.validateTouched();
await form.validateFields(['email', 'password']);

const controller = new AbortController();
await form.validateAll(controller.signal);
controller.abort();
```

Schema adapter:

```ts
import { v } from '@vielzeug/validit';

const schema = v.object({
  age: v.number().min(18, 'Must be 18+'),
  email: v.string().email('Invalid email'),
});

const form = createForm({
  defaultValues: { age: 0, email: '' },
  ...fromSchema(schema),
});
```

## Submission

```ts
try {
  await form.submit(async (values) => {
    await fetch('/api/submit', {
      body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log(error.errors);
  } else if (error instanceof SubmitError) {
    console.log('Submission already in progress');
  } else {
    throw error;
  }
}
```

Submit always touches and validates all fields before calling the handler.

## Subscriptions

```ts
const stopForm = form.subscribeForm((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

const stopEmail = form.subscribeField('email', (field) => {
  console.log(field.value, field.error, field.touched, field.dirty);
});

form.subscribeField('email', () => {}, { immediate: false });

stopEmail();
stopForm();
```

## Bind

```ts
const binding = form.bind('email');

input.value = String(binding.value ?? '');
input.onblur = binding.onBlur;
input.oninput = (event) => {
  binding.onChange((event.target as HTMLInputElement).value);
};

const fileForm = createForm({ defaultValues: { attachment: null as File | null } });
const fileBinding = fileForm.bind('attachment', {
  touchOnBlur: true,
  validateOnBlur: true,
});

fileInput.onchange = (event) => {
  fileBinding.onChange((event.target as HTMLInputElement).files?.[0] ?? null);
};
```

## Reset and Replace

```ts
const form = createForm({ defaultValues: { email: '', name: '' } });

form.reset();
form.replace({ email: 'guest@example.com', name: 'Guest' });
form.resetField('name');
```

## Arrays and Files

```ts
const form = createForm({ defaultValues: { tags: ['a'] } });

form.array('tags').append('b');
form.array('tags').remove(0);
form.array('tags').move(0, 1);

const fd = toFormData(form.values());
```

## Best Practices

- Keep validators pure and deterministic.
- Prefer subscribeField(name, ...) over subscribeForm(...) for field-level rendering.
- Use replace(values) after loading server data to set a new baseline.
- Call dispose() when the form lifecycle ends.
