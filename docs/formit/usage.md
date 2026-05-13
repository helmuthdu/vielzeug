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
await form.validateAll();
await form.validateTouched();
await form.validateFields(['email', 'password']);

const controller = new AbortController();
await form.validateAll(controller.signal);
controller.abort();
```

Validation result structure:

```ts
const result = await form.validateFields(['email']);

console.log(result.valid); // whole-form validity after this run
console.log(result.errors); // full current error map after the run
```

Schema integration:

```ts
import { createForm, schemaValidator } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const schema = v.object({
  age: v.number().min(18, 'Must be 18+'),
  email: v.string().email('Invalid email'),
});

const form = createForm({
  defaultValues: { age: 0, email: '' },
  validator: schemaValidator(schema),
});
```

## Submission

```ts
const result = await form.submit(async (values) => {
  await fetch('/api/submit', {
    body: JSON.stringify(values),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
});

if (!result.ok && result.type === 'validation') {
  console.log(result.errors);
}

const second = await form.submit(async () => {});

if (!second.ok && second.type === 'concurrent') {
  console.log('Submission already in progress');
}
```

Submit always touches all known fields and runs full validation before calling the handler. Validation failures resolve to `{ ok: false, errors }`.

## Subscriptions

```ts
const stopForm = form.subscribe((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

const stopEmail = form.subscribeField('email', (field) => {
  console.log(field.value, field.error, field.touched, field.dirty);
});

// subscriptions fire synchronously; use sync:true when you also want the current snapshot immediately
form.subscribeField('email', () => {}, { sync: true });

stopEmail();
stopForm();

// Value-only pattern via subscribeField
const stopPreview = form.subscribeField('email', (field) => updatePreview(String(field.value ?? '')), { sync: true });
stopPreview();
```

Snapshot semantics:

- `form.state` and `form.field(name)` return stable, frozen snapshots.
- Reference identity stays the same until a relevant mutation occurs.
- This makes subscriptions directly compatible with external-store patterns.

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { createForm, type Form } from '@vielzeug/formit';

// Reusable hooks
function useFormState<T extends Record<string, unknown>>(form: Form<T>) {
  return useSyncExternalStore(
    (notify) => form.subscribe(() => notify()),
    () => form.state,
  );
}

function useField<T extends Record<string, unknown>, K extends string & keyof T>(form: Form<T>, name: K) {
  return useSyncExternalStore(
    (notify) => form.subscribeField(name, () => notify()),
    () => form.field(name),
  );
}

// Component using the hooks
function LoginForm() {
  const form = createForm({ defaultValues: { email: '', password: '' } });
  const state = useFormState(form);
  const emailField = useField(form, 'email');

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit(async (v) => console.log(v)); }}>
      <input value={emailField.value as string} onChange={(e) => form.set('email', e.target.value)} onBlur={() => form.touch('email')} />
      {emailField.error && <p>{emailField.error}</p>}
      <button type="submit" disabled={state.isSubmitting}>Submit</button>
    </form>
  );
}
```

```ts [Vue 3]
import { shallowRef, onScopeDispose } from 'vue';
import { createForm } from '@vielzeug/formit';

function useForm<T extends Record<string, unknown>>(defaultValues: T) {
  const form = createForm({ defaultValues });
  const state = shallowRef(form.state);

  const stop = form.subscribe((snapshot) => { state.value = snapshot; });
  onScopeDispose(() => stop());

  return { form, state };
}
```

```svelte [Svelte]
<script lang="ts">
  import { createForm } from '@vielzeug/formit';

  const form = createForm({ defaultValues: { email: '', password: '' } });
  const emailField = {
    subscribe(run: (snapshot: ReturnType<typeof form.field>) => void) {
      return form.subscribeField('email', run, { sync: true });
    },
  };

  const formState = {
    subscribe(run: (snapshot: typeof form.state) => void) {
      return form.subscribe(run, { sync: true });
    },
  };

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await form.submit(async (values) => console.log(values));
  }
</script>

<form on:submit={handleSubmit}>
  <input value={$emailField.value as string} on:input={(e) => form.set('email', (e.currentTarget as HTMLInputElement).value)} on:blur={() => form.touch('email')} />
  <button type="submit" disabled={$formState.isSubmitting}>Submit</button>
</form>
```

:::

### Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Touched and Error Controls

```ts
form.touch('email');
form.untouch('email');
form.touchAll();
form.untouchAll();

form.setError('email', 'Invalid email');
form.resetErrors({ email: 'Invalid email', password: 'Too short' });
form.setValidator('email', (value) => (!String(value).includes('@') ? 'Invalid email' : undefined));
```

## Bind

`bind()` is a vanilla-DOM convenience helper. In React, Vue, Svelte, and similar frameworks, prefer subscriptions plus explicit `form.field(...)`, `form.set(...)`, and `form.touch(...)` calls.

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

For grouped synchronous updates, wrap writes in `form.batch(() => { ... })` so subscribers observe one consolidated notification.

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
form.array('tags').append('z'); // ['a', 'z']
form.array('tags').prepend('first'); // ['first', 'a', 'z']
form.array('tags').insert(1, 'mid'); // ['first', 'mid', 'a', 'z']
form.array('tags').swap(0, 2); // ['a', 'mid', 'first', 'z']
form.array('tags').replace(1, 'new'); // ['a', 'new', 'first', 'z']
form.array('tags').remove(3); // ['a', 'new', 'first']
form.array('tags').move(0, 2); // ['new', 'first', 'a']

const fd = toFormData(form.values());
```

`toFormData` is optimized for browser submit APIs and multipart uploads.
When you inspect multipart entries later, browsers may surface `Blob` parts as `File` instances.

## Working with Other Vielzeug Libraries

### With Validit

Use `schemaValidator()` to keep one shared schema for runtime validation and static type inference.

```ts
import { createForm, schemaValidator } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const schema = v.object({
  email: v.string().email(),
  password: v.string().min(8),
});

const form = createForm({
  defaultValues: { email: '', password: '' },
  validator: schemaValidator(schema),
});
```

## Best Practices

- Keep validators pure and deterministic.
- Use `mode: 'onBlur'` or `mode: 'onTouched'` for most user-facing forms; reserve `mode: 'onChange'` for real-time search or filter forms.
- Prefer `subscribeField(name, ...)` over `subscribe(...)` for field-level rendering.
- Use `replace(values)` after loading server data to set a new baseline.
- Use `removeField(name)` when unmounting conditional fields so their state does not leak into validation.
- Use the `SubmitResult` returned from `submit()` when you want to handle validation failures without exceptions.
- Call `dispose()` when the form lifecycle ends.

### Connect a Schema Validator

Use `schemaValidator()` to integrate any `safeParse`-compatible schema (e.g. Validit, Zod):

```ts
import { v } from '@vielzeug/validit';
import { createForm, schemaValidator } from '@vielzeug/formit';

const schema = v.object({
  email: v.string().email('Invalid email'),
  password: v.string().min(8, 'Min 8 characters'),
  age: v.number().min(18, 'Must be 18 or older'),
});

const form = createForm({
  defaultValues: { email: '', password: '', age: 0 },
  validator: schemaValidator(schema),
});

const result = await form.submit(async (values) => {
  await fetch('/api/register', { method: 'POST', body: JSON.stringify(values) });
});
if (!result.ok && result.type === 'validation') console.log(result.errors); // { email: '...', age: '...' }
```

### Stable Subscription Patterns

```ts
// ✅ React: useSyncExternalStore
const state = useSyncExternalStore(
  (notify) => form.subscribe(() => notify()),
  () => form.state,
);

// ✅ Vue/Svelte: subscribe + cleanup in lifecycle hooks
const stop = form.subscribe((snapshot) => { state.value = snapshot; });
onUnmounted(stop);

// ❌ subscribe without cleanup — leaks listeners
form.subscribe(() => { /* ... */ });
```

### Use `bind()` Only for Vanilla DOM

```tsx
// ✅ Plain DOM / non-reactive usage
const emailBinding = form.bind('email');
input.value = String(emailBinding.value ?? '');
input.addEventListener('blur', emailBinding.onBlur);
input.addEventListener('change', (e) => emailBinding.onChange(e.target.value));

// ✅ In frameworks, prefer explicit reactive reads/writes
<input
  value={String(form.field('email').value ?? '')}
  onChange={(e) => form.set('email', e.target.value)}
  onBlur={() => form.touch('email')}
/>
```

### Show Errors Only After Touch

```tsx
// ✅ Only show after user interaction
{form.field('email').touched && state.errors['email'] && (
  <span>{state.errors['email']}</span>
)}

// ❌ Shows errors on page load before user types anything
{state.errors['email'] && <span>{state.errors['email']}</span>}
```
