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
| `form.submit()` | Deterministic submit flow with validation |
| `form.bind()` | Read/write field binding with live getters |
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
  bindDefaults?: BindConfig;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `defaultValues` | `TValues` | Initial values and dirty baseline |
| `validators` | `Partial<Record<FlatKeyOf<TValues>, FieldValidator &#124; FieldValidator[]>>` | Field-level validators keyed by typed path |
| `validator` | `FormValidator<TValues>` | Form-level validator returning an error map |
| `bindDefaults` | `BindConfig` | Default behavior for `bind(name, config?)` |

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
submit<R>(handler: (values: TValues) => R | Promise<R>, signal?: AbortSignal): Promise<R>
```

Submit behavior:

- marks all known fields as touched
- runs full validation (`validate()`)
- throws `FormValidationError` when invalid
- throws `SubmitError` when a concurrent submit is already running

`signal` is optional and passed to validation.

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
array(name: FlatKeyOf<TValues>): {
  append(value: unknown): void;
  remove(index: number): void;
  move(from: number, to: number): void;
}
```

Array helpers are no-ops when the current field value is not an array, except `append`, which initializes with a new array.

## Reset and Replace

```ts
reset(): void
replace(newValues: TValues): void
resetField(name: FlatKeyOf<TValues>): void
```

- `reset()` restores current baseline and clears errors/touched/dirty.
- `replace(values)` replaces both current values and baseline.
- `resetField(name)` resets one field and clears its local state.

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
- `SetOptions`
- `FlatKeyOf<TValues>` and `TypeAtPath<TValues, K>`
