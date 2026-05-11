---
title: Formit — Usage Guide
description: Practical usage patterns for values, validation modes, submission, subscriptions, binding, and helpers.
---

[[toc]]

## Basic Usage

```ts
import { createForm } from '@vielzeug/formit';

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
await form.validate();
await form.validate('touched');
await form.validate(['email', 'password']);

const controller = new AbortController();
await form.validate(undefined, controller.signal);
controller.abort();
```

Validation result structure:

```ts
const result = await form.validate(['email']);

console.log(result.valid); // whole-form validity after this run
console.log(result.errors); // scoped result for validated fields only
console.log(result.allErrors); // full current error map
```

Schema adapter:

```ts
import { createForm, fromSchema } from '@vielzeug/formit';
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
import { FormValidationError, SubmitError } from '@vielzeug/formit';

// Option A: throw-based
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

// Option B: callback-based (no try/catch needed)
await form.submit(
  async (values) => {
    await fetch('/api/submit', {
      body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  },
  (errors) => console.log('Validation failed:', errors),
);
```

Submit always touches all known fields and runs full validation before calling the handler.

## Subscriptions and Watch

```ts
const stopForm = form.subscribeForm((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

const stopEmail = form.subscribeField('email', (field) => {
  console.log(field.value, field.error, field.touched, field.dirty);
});

// subscriptions are deferred by default; use sync:true when you need an immediate snapshot
form.subscribeField('email', () => {}, { sync: true });

stopEmail();
stopForm();

// watch: shorthand for subscribeField that only delivers the value
const stopWatch = form.watch('email', (v) => updatePreview(v), { sync: true });
stopWatch();
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

Global bind defaults via `mode`:

```ts
// mode pre-populates bindDefaults for all bind() calls
const form = createForm({
  mode: 'onBlur', // 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'
  defaultValues: { email: '' },
  validators: { email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined) },
});

// No per-field config needed — validateOnBlur is inherited from mode
const email = form.bind('email');
```

Explicit `bindDefaults` always takes precedence over `mode`.

Global bind defaults via `bindDefaults` (for fine-grained control):

```ts
const formWithDefaults = createForm({
  bindDefaults: { touchOnBlur: true, validateOnBlur: true },
  defaultValues: { email: '' },
  validators: { email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined) },
});

const email = formWithDefaults.bind('email');
```

## Reset, Replace, and Remove

```ts
const form = createForm({ defaultValues: { email: '', name: '' } });

form.reset();
form.replace({ email: 'guest@example.com', name: 'Guest' });
form.resetField('name');

// removeField: drops value, baseline, state, and validator entirely
form.removeField('name'); // use for conditional fields that are unmounted
```

When loading server data as the new source of truth, prefer `replace(values)` so subsequent `reset()` uses that new baseline.

## Arrays and Files

```ts
const form = createForm({ defaultValues: { tags: ['a'] } });

// All 7 array helpers
form.array('tags').append('z');       // ['a', 'z']
form.array('tags').prepend('first');  // ['first', 'a', 'z']
form.array('tags').insert(1, 'mid');  // ['first', 'mid', 'a', 'z']
form.array('tags').swap(0, 2);        // ['a', 'mid', 'first', 'z']
form.array('tags').replace(1, 'new'); // ['a', 'new', 'first', 'z']
form.array('tags').remove(3);         // ['a', 'new', 'first']
form.array('tags').move(0, 2);        // ['new', 'first', 'a']

const fd = toFormData(form.values());
```

`toFormData` is optimized for browser submit APIs and multipart uploads.

## Best Practices

- Keep validators pure and deterministic.
- Use `mode: 'onBlur'` or `mode: 'onTouched'` for most user-facing forms; reserve `mode: 'onChange'` for real-time search or filter forms.
- Prefer `subscribeField(name, ...)` or `watch(name, ...)` over `subscribeForm(...)` for field-level rendering.
- Use `replace(values)` after loading server data to set a new baseline.
- Use `removeField(name)` when unmounting conditional fields so their state does not leak into validation.
- Use the `onInvalid` callback in `submit()` when you want to scroll to errors or show a toast without try/catch.
- Call `dispose()` when the form lifecycle ends.
