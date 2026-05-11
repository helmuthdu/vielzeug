---
title: Formit — API Reference
description: Complete API reference for Formit form creation, validation, submission, subscriptions, and helpers.
---

[[toc]]

## API At a Glance

| Symbol | Purpose |
| --- | --- |
| `createForm()` | Create a typed form controller |
| `form.validate()` | Validate all, touched, or specific fields |
| `form.validateField()` | Validate a single field |
| `form.submit()` | Deterministic submit flow with validation |
| `form.watch()` | Subscribe to a field's live value |
| `form.bind()` | Read/write field binding with live getters |
| `form.array()` | Append, prepend, insert, remove, move, swap, replace array items |
| `form.removeField()` | Drop a field and its state/validator entirely |
| `fromSchema()` | Adapt safe-parse-compatible schemas to Formit |
| `toFormData()` | Serialize values into `FormData` |

## Package Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/formit` | `createForm`, `fromSchema`, `toFormData`, error classes, and types |

## createForm()

```ts
function createForm<TValues extends Record<string, unknown>>(init?: FormOptions<TValues>): Form<TValues>;
```

Creates a typed form controller.

### FormOptions

```ts
interface FormOptions<TValues extends Record<string, unknown>> {
  defaultValues?: TValues;
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator | FieldValidator[]>>;
  validator?: FormValidator<TValues>;
  mode?: ValidationMode;
  bindDefaults?: BindConfig;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `defaultValues` | `TValues` | Initial values and dirty baseline |
| `validators` | `Partial<Record<FlatKeyOf<TValues>, FieldValidator &#124; FieldValidator[]>>` | Field-level validators keyed by typed path |
| `validator` | `FormValidator<TValues>` | Form-level validator returning an error map |
| `mode` | `ValidationMode` | Global validation trigger — see [Validation Mode](#validation-mode) |
| `bindDefaults` | `BindConfig` | Default behavior for `bind(name, config?)`. Takes precedence over `mode`. |

`validators` and form value APIs are path-typed from `TValues`. For dynamic forms, use a broader shape such as `Record<string, unknown>`.

## Values

### form.get(name)

```ts
get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>
```

### form.set(name, value, options?)

```ts
set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void
```

```ts
type SetOptions = {
  track?: boolean;   // default: true
  touched?: boolean; // default: false
};
```

`track: false` writes a value without updating dirty tracking.

### form.values()

```ts
values(): TValues
```

Returns a nested values object reconstructed from Formit's internal flat store.

## Field State

### form.field(name)

```ts
field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>
```

```ts
type FieldState<V = unknown> = {
  value: V;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
};
```

## Error Management

```ts
setError(name: FlatKeyOf<TValues>, message: string): void
clearError(name: FlatKeyOf<TValues>): void
mergeErrors(next: Partial<Record<FlatKeyOf<TValues>, string | undefined>>): void
replaceErrors(next: Partial<Record<FlatKeyOf<TValues>, string>>): void
readonly errors: Record<string, string>
```

- `mergeErrors` updates specific fields and clears only fields explicitly set to `undefined`.
- `replaceErrors` replaces the full error map in one step.

## Touch

```ts
touch(name?: FlatKeyOf<TValues>): void
untouch(name?: FlatKeyOf<TValues>): void
```

- `touch(name)` / `untouch(name)` targets a single field.
- `touch()` / `untouch()` applies to all known fields.

## Validation

```ts
validate(fields?: FlatKeyOf<TValues>[] | 'touched', signal?: AbortSignal): Promise<ValidateResult>
validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>
```

Validation modes:

- `validate()` runs full validation: all field validators and the form validator.
- `validate('touched')` validates touched fields only.
- `validate(['email', 'password'])` validates only listed fields.

```ts
type ValidateResult = {
  valid: boolean;
  errors: Record<string, string>;
  allErrors: Record<string, string>;
};
```

- `errors` is scoped to the fields validated in that run.
- `allErrors` is the full error map after the run.

`signal` is optional and aborts the validation run.

## Submit

```ts
submit<R>(
  handler: (values: TValues) => R | Promise<R>,
  onInvalid?: (errors: Record<string, string>) => void | Promise<void>,
): Promise<R | void>
```

Submit behavior:

- marks all known fields as touched
- runs full validation (`validate()`)
- if invalid and `onInvalid` is provided — calls `onInvalid(errors)` and returns `undefined`
- if invalid and `onInvalid` is omitted — throws `FormValidationError`
- throws `SubmitError` when a concurrent submit is already running

```ts
// Throw-based (onInvalid omitted)
try {
  await form.submit(save);
} catch (e) {
  if (e instanceof FormValidationError) scrollToFirst(e.errors);
}

// Callback-based (no try/catch needed)
await form.submit(save, (errors) => scrollToFirst(errors));
```

## Subscriptions

```ts
subscribeForm(listener: (state: FormState<TValues>) => void, options?: SubscribeOptions): Unsubscribe
subscribeField<K extends FlatKeyOf<TValues>>(
  name: K,
  listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
  options?: SubscribeOptions,
): Unsubscribe
```

```ts
type SubscribeOptions = { sync?: boolean };
type Unsubscribe = () => void;
```

Subscriptions are deferred by default. Pass `{ sync: true }` to fire immediately with a snapshot.

## Watch

```ts
watch<K extends FlatKeyOf<TValues>>(
  name: K,
  callback: (value: TypeAtPath<TValues, K>) => void,
  options?: SubscribeOptions,
): Unsubscribe
```

Shorthand for `subscribeField` that delivers just the field's current value. Supports `{ sync: true }` for an immediate initial call.

```ts
const stop = form.watch('email', (v) => updatePreview(v), { sync: true });
stop(); // unsubscribe
```

## Bind

```ts
bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>
```

```ts
type BindConfig = {
  touchOnBlur?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
};
```

```ts
type BindResult<V = unknown> = {
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
  onBlur(): void;
  onChange(value: V): void;
};
```

## Arrays

```ts
array(name: FlatKeyOf<TValues>): ArrayField
```

```ts
type ArrayField = {
  append(value: unknown): void;    // add to end
  prepend(value: unknown): void;   // add to front
  insert(index: number, value: unknown): void;  // insert at index
  remove(index: number): void;     // remove by index
  move(from: number, to: number): void;         // reorder
  swap(a: number, b: number): void;             // exchange two items
  replace(index: number, value: unknown): void; // overwrite at index
};
```

All methods are no-ops when the current field value is not an array, except `append` and `prepend`, which initialize with a new single-item array.

```ts
const items = form.array('items');

items.append({ id: 4, label: 'D' });
items.prepend({ id: 0, label: 'First' });
items.insert(1, { id: 99, label: 'Mid' });
items.swap(0, 2);
items.replace(1, { id: 1, label: 'Updated' });
items.remove(0);
items.move(1, 3);
```

## Reset and Replace

```ts
reset(): void
replace(newValues: TValues): void
resetField(name: FlatKeyOf<TValues>): void
removeField(name: FlatKeyOf<TValues>): void
```

- `reset()` restores current baseline and clears errors/touched/dirty.
- `replace(values)` replaces both current values and baseline.
- `resetField(name)` resets one field to its baseline value and clears its local state.
- `removeField(name)` drops the field entirely: removes its value, baseline entry, dirty/touched/error state, and registered validator. Subsequent `reset()` will not restore the field. Use this for conditional fields that are unmounted.

## Validation Mode

```ts
type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched';
```

Set `mode` in `FormOptions` to control when validation is triggered globally. It pre-populates `bindDefaults`, so every `bind()` call inherits the behavior without explicit per-field config.

| Mode | Validates on blur | Validates on change | Notes |
| --- | --- | --- | --- |
| `'onSubmit'` (default) | ❌ | ❌ | Validates only during `submit()` |
| `'onBlur'` | ✅ | ❌ | Validates when a field loses focus |
| `'onChange'` | ❌ | ✅ | Validates after every value change |
| `'onTouched'` | ✅ | ✅ | Validates on blur first, then on every change |

Explicit `bindDefaults` always takes precedence over `mode`.

```ts
const form = createForm({
  mode: 'onBlur',
  defaultValues: { email: '', name: '' },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    name: (v) => (!v ? 'Required' : undefined),
  },
});

// All bind() calls now inherit validateOnBlur: true automatically
const emailBinding = form.bind('email');
const nameBinding = form.bind('name');
```

## Lifecycle

```ts
dispose(): void
readonly disposed: boolean
```

After `dispose()`, mutating APIs throw.

## Standalone Utilities

```ts
fromSchema(schema): Pick<FormOptions, 'validator'>
toFormData(values: Record<string, unknown>): FormData
```

`fromSchema()` accepts safe-parse-compatible schemas (for example Validit, Zod, and similar adapters) and maps root-level schema issues to `_form`.

## Error Classes

```ts
class FormValidationError extends Error {
  readonly type: 'validation';
  readonly errors: Record<string, string>;
}

class SubmitError extends Error {
  readonly type: 'submit';
}
```

## Exported Types

Common exported types:

- `Form<TValues>`
- `FormOptions<TValues>`
- `FormState<TValues>`
- `FieldState<V>`
- `BindConfig` and `BindResult<V>`
- `ValidateResult`
- `ValidationMode`
- `SetOptions`
- `FlatKeyOf<TValues>` and `TypeAtPath<TValues, K>`
