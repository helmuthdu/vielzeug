---
title: Forge — Usage Guide
description: Practical usage patterns for values, validation, submission, subscriptions, connect, scope, and framework adapters.
---

[[toc]]

## Basic Usage

```ts
import { createForm } from '@vielzeug/forge';

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

Forge is path-typed first. Provide a concrete values shape so field paths and value types are inferred.

```ts
type Values = {
  email: string;
  profile: { age: number; name: string };
};

const form = createForm<Values>({
  defaultValues: { email: '', profile: { age: 0, name: '' } },
});

form.set('profile.age', 42); // TypeScript error if type is wrong
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
await form.validateFields(['email', 'password']);

const controller = new AbortController();
await form.validate(controller.signal);
controller.abort();
```

Validation result:

```ts
const result = await form.validateFields(['email']);

console.log(result.valid); // true only if no errors exist after this run
console.log(result.errors); // full current error map after the run
```

Schema integration — pass a `safeParse`-compatible schema directly to `validator`:

```ts
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';

const schema = s.object({
  age: s.number().min(18, 'Must be 18+'),
  email: s.string().email('Invalid email'),
});

const form = createForm({
  defaultValues: { age: 0, email: '' },
  validator: schema, // auto-detected as a safeParse schema
});
```

For per-field validation with a schema, use `fieldValidator` from `@vielzeug/forge/validators`:

```ts
import { fieldValidator } from '@vielzeug/forge/validators';
import { s } from '@vielzeug/spell';

const form = createForm({
  defaultValues: { age: 0, email: '' },
  validators: {
    age: fieldValidator(s.number().min(18, 'Must be 18+')),
    email: fieldValidator(s.string().email('Invalid email')),
  },
});
```

## Submission

```ts
const result = await form.submit(async (values) => {
  const res = await fetch('/api/submit', {
    body: JSON.stringify(values),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  return res.json();
});

if (!result.ok && result.type === 'validation') {
  console.log(result.errors);
}

if (result.ok) {
  console.log(result.value); // typed return value from the handler
}
```

`submit()` always:

1. Marks all known fields touched
2. Runs full validation
3. If invalid: returns `{ ok: false, type: 'validation', errors }`
4. If valid: calls the handler and returns `{ ok: true, value }`

Calling `submit()` while a submission is already in progress throws — guard with `state.isSubmitting` if needed.

## Async Default Values

Pass an async factory to `defaultValues` to load initial state remotely. The form's `state.isLoading` / `form.isLoading` is `true` while the factory is pending.

```ts
const form = createForm({
  defaultValues: async () => {
    const res = await fetch('/api/user/me');
    return res.json();
  },
});

// isLoading is true until the factory resolves
form.subscribe((state) => {
  if (!state.isLoading) renderForm(form.values());
});
```

## Connect (Field Binding)

`connect()` returns a live binding object with DOM event handlers and live getters. Call once per field and store the result — do not destructure. Each binding owns its own independent debounce timer; call `disconnect()` when the field unmounts to cancel it.

```ts
const emailConn = form.connect('email');

input.addEventListener('change', (e) => emailConn.onChange(e.target.value));
input.addEventListener('blur', () => emailConn.onBlur());

// Live getters re-evaluate on every access
console.log(emailConn.value, emailConn.error, emailConn.touched, emailConn.dirty);

// On unmount: cancel any pending debounce timer
emailConn.disconnect();
```

### Validation Modes

Pass a `ConnectOptions` object (or a `ValidationModes` preset) to control when validation triggers:

```ts
import { createForm, ValidationModes } from '@vielzeug/forge';

// Global default for all connect() calls
const form = createForm({
  defaultValues: { email: '', password: '' },
  connect: ValidationModes.onBlur, // validate each field on blur
});

// Per-field override
const emailConn = form.connect('email', ValidationModes.onChange);
const passwordConn = form.connect('password', { validateOnBlur: true, debounce: 300 });
```

| Preset                               | `touchOnBlur` | `validateOnBlur` | `validateOnChange` | `validateOnTouch` |
| ------------------------------------ | ------------- | ---------------- | ------------------ | ----------------- |
| `ValidationModes.onSubmit` (default) | —             | —                | —                  | —                 |
| `ValidationModes.onBlur`             | <sg-icon name="check" size="16"></sg-icon>            | <sg-icon name="check" size="16"></sg-icon>               | —                  | —                 |
| `ValidationModes.onChange`           | <sg-icon name="check" size="16"></sg-icon>            | —                | <sg-icon name="check" size="16"></sg-icon>                 | —                 |
| `ValidationModes.onTouched`          | <sg-icon name="check" size="16"></sg-icon>            | <sg-icon name="check" size="16"></sg-icon>               | —                  | <sg-icon name="check" size="16"></sg-icon>                |

`debounce` delays auto-triggered validation by a given number of milliseconds — useful for async validators on `onChange` to avoid one request per keystroke.

## Scoped Sub-Forms

`scope(prefix)` returns a sub-form whose field paths are relative to the prefix. All state and lifecycle is shared with the parent form.

```ts
const form = createForm({
  defaultValues: {
    name: 'Alice',
    address: { city: 'New York', street: '123 Main St', zip: '10001' },
  },
  validators: {
    'address.city': (v) => (!v ? 'City is required' : undefined),
  },
});

// scope() is memoized — repeated calls with the same prefix return the same object
const address = form.scope('address');

address.get('city'); // same as form.get('address.city')
address.set('city', 'Portland'); // same as form.set('address.city', 'Portland')
address.connect('city'); // same as form.connect('address.city')
await address.validate(); // validates only address.* fields; returns scoped errors (no prefix)
await address.submit((vals) => vals); // validates and submits only address.* fields
```

**Key characteristics:**

- `dispose()` on a scoped form is a no-op — call `parentForm.dispose()` to tear down.
- `scope.state` returns the **full** form state. Use `scope.validate()` or `scope.submit()` for scoped validity checks; their results contain relative keys and a scoped `valid` flag.
- `touchedFields` in `state` contains full-prefixed paths. Prefer `scope.validate()` over `scope.validateFields([...state.touchedFields])` to avoid double-prefixing.

### Scoped Subscriptions

`subscribeScoped` delivers form state filtered to the scope's prefix. `errors`, `touchedFields`, and `validatingFields` use relative keys. `isDirty`, `isValid`, `isTouched`, and `isValidating` reflect **only the scoped fields**. The listener **only fires when the scoped projection changes** — mutations outside the prefix are suppressed.

```ts
const address = form.scope('address');

address.subscribeScoped((state) => {
  // state.errors → { city: 'Required' }  (not 'address.city')
  // state.isDirty → true only when an address.* field is dirty
  // does not fire when form.set('name', 'Alice') is called
  renderAddressErrors(state.errors);
});
```

## Subscriptions

```ts
const stopForm = form.subscribe((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

const stopEmail = form.subscribeField('email', (field) => {
  console.log(field.value, field.error, field.touched, field.dirty);
});

// Pass sync: true to receive the current snapshot immediately on subscription
form.subscribeField('email', (field) => updatePreview(String(field.value)), { sync: true });

stopEmail();
stopForm();
```

Snapshot semantics:

- `form.state` and `form.field(name)` return stable, frozen snapshots.
- Reference identity is preserved until a relevant mutation occurs.
- These are directly compatible with external-store patterns such as React `useSyncExternalStore`, Vue `shallowRef`, and the Svelte store protocol.

## Streaming Validation

`validateStream()` runs all field validators in parallel and yields each result as it resolves. It is **read-only** — it does not write errors to form state. The form-level validator, if set, is yielded last with `field: '_form'`.

```ts
for await (const { field, error } of form.validateStream()) {
  if (error) showInlineError(field, error);
}
// form.state.errors is unchanged after the loop
```

## Snapshots and Restore

Capture and replay complete form state for undo/redo or "discard changes" flows:

```ts
const draft = form.snapshot();

// ... user edits ...
form.set('email', 'different@example.com');

// Revert all changes, including errors, touched, dirty, and submitCount
form.restore(draft);
```

## Arrays

```ts
const items = form.array('items');

items.append({ name: '' });
items.prepend({ name: 'first' });
items.insert(1, { name: 'middle' });
items.remove(0);
items.move(1, 0);
items.swap(0, 1);
items.replace(0, { name: 'updated' });
```

`form.array()` returns a cached helper — call it once and reuse.

## Batching

Wrap multiple mutations in `batch()` to emit only one notification:

```ts
form.batch(() => {
  form.set('firstName', 'Alice');
  form.set('lastName', 'Smith');
  form.touch('firstName');
});
// subscribers notified once
```

## Reset, Replace, and Patch

```ts
form.reset(); // restore all values to baseline; clear errors/touched/dirty/submitCount
form.replace({ email: '', name: '' }); // replace values and baseline; also resets submitCount
form.patch({ name: 'Alice' }); // merge specific fields into store and baseline (marks them clean)
form.resetField('email'); // restore single field to baseline
form.removeField('coupon'); // drop field entirely (value, touched, error, validator)
```

`patch()` accepts a `DeepPartial` object — nested paths are flattened automatically. Useful for applying a server response without dirtying the form.

## Lifecycle

```ts
form.dispose(); // tear down: abort all pending validation, clear listeners
console.log(form.disposed); // true after dispose()
```

After `dispose()`, all mutating APIs throw.

## Framework Integration

Forge ships dedicated adapters for React, Vue, and Svelte.

::: code-group

```tsx [React]
// lib/form-hooks.ts
import { useSyncExternalStore } from 'react';
import { createForgeHooks } from '@vielzeug/forge/react';

export const { useFormState, useField, useFormValues } = createForgeHooks(useSyncExternalStore);

// MyForm.tsx
import { createForm } from '@vielzeug/forge';
import { useFormState, useField } from './lib/form-hooks';

const form = createForm({ defaultValues: { email: '', password: '' } });

function LoginForm() {
  const state = useFormState(form);
  const email = useField(form, 'email');
  const conn = form.connect('email', { touchOnBlur: true });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(handleLogin);
      }}>
      <input
        value={email.value as string}
        onChange={(e) => conn.onChange(e.target.value)}
        onBlur={() => conn.onBlur()}
      />
      {email.error && <p>{email.error}</p>}
      <button type="submit" disabled={state.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

```ts [Vue 3]
// lib/form-composables.ts
import { onScopeDispose, shallowRef } from 'vue';
import { createForgeComposables } from '@vielzeug/forge/vue';

export const { useFormState, useField, useFormValues } = createForgeComposables({ shallowRef, onScopeDispose });

// MyForm.vue
import { createForm } from '@vielzeug/forge';
import { useFormState, useField } from './lib/form-composables';

const form = createForm({ defaultValues: { email: '' } });

export default {
  setup() {
    const state = useFormState(form);
    const email = useField(form, 'email');
    const conn = form.connect('email');

    return { state, email, conn };
  },
};
```

```svelte [Svelte]
<script>
  import { createForm } from '@vielzeug/forge';
  import { formState, fieldStore } from '@vielzeug/forge/svelte';

  const form = createForm({ defaultValues: { email: '' } });
  const state = formState(form);
  const email = fieldStore(form, 'email');
  const conn = form.connect('email');
</script>

<form on:submit|preventDefault={() => form.submit(handleSubmit)}>
  <input
    bind:value={$email.value}
    on:change={(e) => conn.onChange(e.target.value)}
    on:blur={() => conn.onBlur()}
  />
  {#if $email.error}<span>{$email.error}</span>{/if}
  <button disabled={$state.isSubmitting}>Submit</button>
</form>
```

:::

## Working with Other Vielzeug Libraries

### With Spell

Combine Spell schemas with Forge to get typed validation rules without writing validator functions by hand.

```ts
import { createForm } from '@vielzeug/forge';
import { fieldValidator } from '@vielzeug/forge/validators';
import { s } from '@vielzeug/spell';

// Per-field validation with a Spell schema
const form = createForm({
  defaultValues: { email: '', password: '', age: 0 },
  validators: {
    age: fieldValidator(s.number().min(18, 'Must be 18+')),
    email: fieldValidator(s.string().email('Invalid email')),
    password: fieldValidator(s.string().min(8, 'Min 8 characters')),
  },
});

// Full-form schema validation (auto-detects safeParse)
const schema = s.object({
  age: s.number().min(18, 'Must be 18+'),
  email: s.string().email('Invalid email'),
  password: s.string().min(8, 'Min 8 characters'),
});

const formWithSchema = createForm({
  defaultValues: { email: '', password: '', age: 0 },
  validator: schema,
});
```

## Best Practices

- Call `connect()` once per field and store the result — never call it inside a render or update loop. Call `binding.disconnect()` when the field unmounts to cancel any pending debounce timer.
- `scope()` is memoized — repeated calls with the same prefix return the same object. Store the result for clarity, but it is safe to call multiple times.
- Prefer `scope.validate()` over `scope.validateFields([...state.touchedFields])` on scoped forms to avoid double-prefixed paths.
- Wrap multi-field mutations in `batch()` to emit a single subscriber notification.
- Pass a `signal` to long-running validators where applicable — Forge passes its own abort signal to validators on `dispose()`.
- Set a `connect` default in `createForm()` using `ValidationModes` presets rather than repeating per-field options.
- Use `replace()` after a successful async load instead of `reset()` — `replace()` updates the baseline so `isDirty` reflects changes against the new data.
- Guard concurrent submissions with `form.isSubmitting` or `state.isSubmitting` — calling `submit()` while a submission is in progress throws synchronously.
