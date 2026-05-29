---
title: Forge - API Reference
description: Complete API reference for Forge form creation, validation, submission, subscriptions, and helpers.
---

[[toc]]

## API At a Glance

| Symbol                                                                                                                                                                                | Purpose                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `createForm()`                                                                                                                                                                        | Create a typed form controller                                                     |
| `form.get()` / `form.set()`                                                                                                                                                           | Read/write field values                                                            |
| `form.field()` / `form.state`                                                                                                                                                         | Read field and form snapshots                                                      |
| `form.validateAll()` / `form.validateTouched()` / `form.validateFields()` / `form.validateField()`                                                                                    | Run validation for all, touched, selected, or one field                            |
| `form.submit()`                                                                                                                                                                       | Deterministic submit flow that returns a `SubmitResult`                            |
| `form.bind()`                                                                                                                                                                         | Vanilla-DOM field binding with live getters and value-based `onChange`             |
| `form.array()`                                                                                                                                                                        | Array helpers (`append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`) |
| `form.subscribe()` / `form.subscribeField()`                                                                                                                                          | Synchronous subscriptions                                                          |
| `form.batch()` / `form.touch()` / `form.untouch()` / `form.touchAll()` / `form.untouchAll()` / `form.setError()` / `form.clearError()` / `form.resetErrors()` / `form.setValidator()` | Explicit mutation and control APIs                                                 |
| `form.reset()` / `form.replace()` / `form.resetField()` / `form.removeField()`                                                                                                        | Baseline and lifecycle operations                                                  |
| `schemaValidator()`                                                                                                                                                                   | Adapt a `safeParse` schema into a form validator                                   |
| `toFormData()`                                                                                                                                                                        | Serialize nested values to `FormData`                                              |

## Package Entry Point

| Entry              | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `@vielzeug/forge` | `createForm`, `schemaValidator`, `toFormData`, `FORM_ERROR`, and types  |

## createForm()

```ts
function createForm<TValues extends Record<string, unknown>>(init?: FormOptions<TValues>): Form<TValues>;
```

Creates a typed form controller.

### FormOptions

```ts
interface FormOptions<TValues extends Record<string, unknown>> {
  defaultValues?: TValues;
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator>>;
  validator?: FormValidator<TValues>;
  mode?: ValidationMode;
  bindDefaults?: BindConfig;
}
```

- `validators`: field-level validators keyed by typed dot-paths.
- `validator`: full-form validator returning a string error map.
- `mode`: default validation behavior used by `bind()`.
- `bindDefaults`: explicit bind defaults (takes precedence over `mode`).

### schemaValidator()

```ts
schemaValidator<TValues extends Record<string, unknown>>(schema: SafeParseSchema): FormValidator<TValues>
```

Use `schemaValidator(schema)` to adapt any `safeParse`-compatible schema and pass it via `validator`:

```ts
const form = createForm({
  defaultValues: { email: '' },
  validator: schemaValidator(mySchema),
});
```

## Values

### form.get(name)

```ts
get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>
```

Returns the stored value for a field path. Missing paths return `undefined`. Parent object paths are not materialized as field keys.

### form.set(name, value, options?)

```ts
set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void
```

```ts
type SetOptions = {
  dirty?: boolean; // default: true
  touched?: boolean; // default: false
};
```

Use `dirty: false` to write without dirty tracking.

### form.values()

```ts
values(): TValues
```

Returns the full nested values object.

## State Access

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

Returns a frozen snapshot for the field. The reference stays stable until that field changes.

### form.state

```ts
readonly state: FormState
```

```ts
type FormState = {
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
};
```

Returns a frozen form snapshot. The reference stays stable between mutations and changes only when form state changes.

## Error and Touched Management

```ts
setError(name: ErrorKeyOf<TValues>, message: string): void
clearError(name: ErrorKeyOf<TValues>): void
resetErrors(errors?: Partial<Record<ErrorKeyOf<TValues>, string | undefined>>): void
setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator): void
touch(name: FlatKeyOf<TValues>): void
untouch(name: FlatKeyOf<TValues>): void
touchAll(): void
untouchAll(): void
```

- `setError(name, message)` sets one field error (message is required).
- `clearError(name)` removes one field error.
- `resetErrors(...)` replaces the full error map.
- `setValidator(name, validator)` adds, replaces, or removes a field validator.
- `touch(name)` marks one field touched.
- `untouch(name)` clears one field's touched state.
- `touchAll()` marks all known fields touched.
- `untouchAll()` clears touched state for all known fields.

## Validation

```ts
validateAll(signal?: AbortSignal): Promise<ValidateResult>
validateTouched(signal?: AbortSignal): Promise<ValidateResult>
validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>
validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>
```

```ts
type ValidateResult = {
  valid: boolean;
  errors: Record<string, string>;
};
```

Validation modes:

- `validateAll()` runs full validation.
- `validateTouched()` validates touched fields only.
- `validateFields(['email', 'password'])` validates selected fields only.

`errors` always reflects the current full error map after the validation run.

## submit()

```ts
submit<R>(
  handler: (values: TValues) => R | Promise<R>,
): Promise<SubmitResult<R>>
```

Submit behavior:

- marks all known fields touched
- runs full validation
- if invalid: returns `{ ok: false, type: 'validation', errors }`
- if valid: returns `{ ok: true, value }`
- if a submit is already in progress: returns `{ ok: false, type: 'concurrent' }`

## Subscriptions

```ts
subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe
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

Pass `{ sync: true }` for an immediate snapshot callback.

Subscriptions otherwise fire synchronously when the form mutates.

Because `state`/`field` snapshots are stable between mutations, these subscriptions integrate naturally with external-store/reactivity patterns such as React `useSyncExternalStore`, Vue `shallowRef`, and the Svelte store protocol.

```ts
bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>
```

```ts
type BindConfig = {
  touchOnBlur?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validateOnTouch?: boolean;
};

type BindResult<V = unknown> = {
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
  onBlur(): void;
  onChange(value: V): void;
};
```

`bind()` is a convenience helper for vanilla DOM usage. In component frameworks, prefer `subscribe()` or `subscribeField()` plus explicit `get`, `field`, `set`, and `touch` calls so rendering stays reactive.

## Arrays

```ts
array(name: FlatKeyOf<TValues>): ArrayField
```

```ts
type ArrayField = {
  append(value: unknown): void;
  prepend(value: unknown): void;
  insert(index: number, value: unknown): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  swap(a: number, b: number): void;
  replace(index: number, value: unknown): void;
};
```

## Reset, Replace, and Remove

```ts
reset(): void
replace(newValues: TValues): void
resetField(name: FlatKeyOf<TValues>): void
removeField(name: FlatKeyOf<TValues>): void
```

## Validation Mode

```ts
type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched';
```

| Mode                   | Validates on blur | Validates on change | Notes                                            |
| ---------------------- | ----------------- | ------------------- | ------------------------------------------------ |
| `'onSubmit'` (default) | no                | no                  | validates during submit/explicit validation only |
| `'onBlur'`             | yes               | no                  | validates when a field blurs                     |
| `'onChange'`           | no                | yes                 | validates after every change                     |
| `'onTouched'`          | yes               | after touch         | validates on blur first, then on change          |

## Lifecycle

```ts
dispose(): void
readonly disposed: boolean
```

After `dispose()`, mutating APIs throw.

## Standalone Utilities

```ts
toFormData(values: Record<string, unknown>): FormData
```

## SubmitResult

```ts
type SubmitResult<T> =
  | { ok: true; value: T }
  | { ok: false; type: 'validation'; errors: Record<string, string> }
  | { ok: false; type: 'concurrent' };
```

`submit()` always resolves — it never throws for validation failures or concurrent calls. Narrow the result with `ok` and `type`.

## Exported Types

Common exported types:

- `Form<TValues>`
- `FormOptions<TValues>`
- `FormState`
- `FieldState<V>`
- `BindConfig` and `BindResult<V>`
- `ValidateResult`
- `SubmitResult<T>`
- `FORM_ERROR`
- `ValidationMode`
- `SetOptions`
- `FlatKeyOf<TValues>` and `TypeAtPath<TValues, K>`
