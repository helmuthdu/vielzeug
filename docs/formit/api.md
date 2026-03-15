---
title: Formit — API Reference
description: Complete API reference for the Formit form management library.
---

# Formit API Reference

[[toc]]

## `createForm(init?)`

```ts
function createForm<TValues extends Record<string, unknown>>(init?: FormOptions<TValues>): Form<TValues>;
```

Creates and returns a new form instance. All options are optional.

### `FormOptions`

```ts
interface FormOptions<TValues> {
  /** Initial field values. Nested objects are auto-flattened to dot-notation keys. */
  defaultValues?: Partial<TValues>;

  /** Per-field validators. A field may have one or an array of validators (first failure wins). */
  validators?: Record<string, FieldValidator | FieldValidator[]>;

  /** Cross-field validator — runs on full validate() and submit() only. */
  validator?: FormValidator<TValues>;
}
```

## Values

### `get(name)`

```ts
get<K extends keyof TValues>(name: K): TValues[K]
get(name: string): unknown
```

Returns the current value for the given field.

### `set(name, value, options?)`

```ts
set<K extends keyof TValues>(name: K, value: TValues[K], options?: SetOptions): void
set(name: string, value: unknown, options?: SetOptions): void
```

Sets the value of a single field.

```ts
interface SetOptions {
  /** If true, mark the field as touched when setting. Default: false */
  touch?: boolean;
}
```

### `patch(entries, options?)`

```ts
patch(entries: Partial<TValues>, options?: SetOptions): void
```

Deep partial merge — sets multiple fields at once. Nested objects are merged recursively; sibling keys not present in `entries` are left unchanged.

### `values()`

```ts
values(): TValues
```

Returns a snapshot of all current values, reconstructing any nested shape from flattened dot-notation keys.

## Field State

### `field(name)`

```ts
field(name: string): FieldState<unknown>
```

Returns a live state snapshot for one field.

```ts
interface FieldState<V = unknown> {
  value: V;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
}
```

### `getError(name)`

```ts
getError(name: string): string | undefined
```

Returns the current error for a specific field without allocating a full `FieldState` snapshot.

### `isFieldDirty(name)`

```ts
isFieldDirty(name: string): boolean
```

Returns `true` if the field's current value differs from its baseline value.

### `isFieldTouched(name)`

```ts
isFieldTouched(name: string): boolean
```

Returns `true` if the field has been marked as touched.

### `errors`

```ts
readonly errors: Record<string, string>
```

All current field errors as a plain object.

### `setError(name, message?)`

```ts
setError(name: string, message?: string): void
```

Manually set or clear a single field's error. Omit `message` (or pass `undefined`) to clear.

### `setErrors(nextErrors)`

```ts
setErrors(nextErrors: Record<string, string>): void
```

Replace all errors at once with the provided map.

### `clearErrors()`

```ts
clearErrors(): void
```

Clears all field errors. Shorthand for `setErrors({})`.

## Touch

### `touch(first, ...rest)`

```ts
touch(first: string, ...rest: string[]): void
```

Mark one or more fields as touched.

### `touchAll()`

```ts
touchAll(): void
```

Mark every field as touched. Useful before submit to surface all errors to the user.

### `untouch(name)`

```ts
untouch(name: string): void
```

Remove the touched state from a single field. Useful in multi-step forms when moving between steps.

### `untouchAll()`

```ts
untouchAll(): void
```

Remove the touched state from all fields.

## Array Fields

### `appendField(name, value)`

```ts
appendField(name: string, value: unknown): void
```

Appends an item to the end of an array field.

### `removeField(name, index)`

```ts
removeField(name: string, index: number): void
```

Removes the item at `index` from an array field.

### `moveField(name, from, to)`

```ts
moveField(name: string, from: number, to: number): void
```

Moves an array item from one index to another. Useful for drag-and-drop reordering.

## Validation

### `validateField(name, signal?)`

```ts
validateField(name: string, signal?: AbortSignal): Promise<string | undefined>
```

Runs all field-level validators for the given field. Sets `isValidating` while running and stores the result in the error map. Returns the resulting error string, or `undefined` if valid.

### `validate(options?)`

```ts
validate(options?: ValidateOptions<TValues>): Promise<ValidateResult>
```

Validates the form and returns a `ValidateResult`.

```ts
/** Result returned by form.validate(). */
interface ValidateResult {
  /** Whether the entire error map is empty after this run. */
  valid: boolean;
  /** Full current error map (all fields, not only the ones validated in this run). */
  errors: Record<string, string>;
}
```

```ts
interface ValidateOptions<TValues extends Record<string, unknown> = Record<string, unknown>> {
  /** Cancel the validation run. */
  signal?: AbortSignal;
  /**
   * Only validate fields the user has touched.
   * @remarks Treated as a partial run — the form-level `validator` is NOT run.
   */
  onlyTouched?: boolean;
  /**
   * Restrict validation to these fields (partial validation).
   * When supplied, the form-level `validator` is NOT run.
   * Errors on other fields are left unchanged.
   * Pass an empty array to validate nothing.
   */
  fields?: FlatKeyOf<TValues>[];
}
```

| Mode    | `fields` supplied | Form-level validator | Other errors |
| ------- | ----------------- | -------------------- | ------------ |
| Full    | No                | Runs                 | Replaced     |
| Partial | Yes               | Skipped              | Preserved    |

## Submit

### `submit(handler, options?)`

```ts
submit<R>(
  handler: (values: TValues) => R | Promise<R>,
  options?: SubmitOptions,
): Promise<R>
```

Validates the form (unless `skipValidation` is set), then calls `handler` with the current values. Returns the handler's result.

```ts
interface SubmitOptions<TValues extends Record<string, unknown> = Record<string, unknown>> {
  /** Restrict validation to these fields. */
  fields?: FlatKeyOf<TValues>[];
  /** Cancel the operation. */
  signal?: AbortSignal;
  /** Skip validation before calling the handler. */
  skipValidation?: boolean;
}
```

**Behaviour:**

1. If `isSubmitting` is already `true`, throws `SubmitError` (double-submit guard).
2. Sets `isSubmitting = true`, increments `submitCount`.
3. If `skipValidation` is not set, runs `touchAll()` then validates. Throws `FormValidationError` on failure.
4. Calls `handler(values)` and awaits the result.
5. Resets `isSubmitting = false` when done (success or error).

## Bind

### `bind(name, config?)`

```ts
bind(name: string, config?: BindConfig): BindResult
```

Returns a memoized live descriptor for wiring a field to a DOM input or framework component. The `value`, `error`, `touched`, and `dirty` properties are getters — they read the current value fresh each time. Same arguments always return the same object.

```ts
interface BindResult<V = unknown, K extends string = string> {
  readonly name: K;
  onBlur(): void;
  onChange(event: unknown): void;
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
}
```

```ts
interface BindConfig {
  /**
   * Custom extractor for the value from a change event.
   * Default: `(e) => (e.target as HTMLInputElement).value`
   */
  valueExtractor?: (event: unknown) => unknown;
  /** Whether to call `touch(name)` on blur. Default: true */
  touchOnBlur?: boolean;
  /** Whether to call `validateField(name)` on blur. Default: false */
  validateOnBlur?: boolean;
  /** Whether to call `validateField(name)` on every change. Default: false */
  validateOnChange?: boolean;
}
```

## Reset

### `reset(newValues?)`

```ts
reset(newValues?: Partial<TValues>): void
```

Resets the entire form. If `newValues` is supplied, it is deeply merged in as both the new current values and the new baseline for dirty tracking. If omitted, the form reverts to the original `defaultValues`.

Clears all errors, touched flags, and dirty state.

### `resetField(name)`

```ts
resetField(name: string): void
```

Resets a single field to its `defaultValues` value. Clears its error, touched flag, and dirty state without affecting the rest of the form.

## State

### `state`

```ts
readonly state: FormState
```

Returns a snapshot of the complete form state. A new snapshot object is created each time a field changes.

```ts
interface FormState<TValues extends Record<string, unknown> = Record<string, unknown>> {
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
  errors: Record<string, string>;
  /** Flat dot-notation keys of all fields that currently differ from their baseline value. */
  dirtyFields: FlatKeyOf<TValues>[];
}
```

### Individual getters

| Getter         | Type                     | Description                                         |
| -------------- | ------------------------ | --------------------------------------------------- |
| `isValid`      | `boolean`                | No errors currently present                         |
| `isDirty`      | `boolean`                | At least one field differs from its default         |
| `isTouched`    | `boolean`                | At least one field has been touched                 |
| `isValidating` | `boolean`                | A `validateField` or `validate` call is in progress |
| `isSubmitting` | `boolean`                | A `submit` handler is running                       |
| `submitCount`  | `number`                 | Number of times `submit` has been called            |
| `errors`       | `Record<string, string>` | All current field errors                            |
| `disposed`     | `boolean`                | Whether `dispose()` has been called                 |

## Subscriptions

### `subscribe(listener, options?)`

```ts
subscribe(listener: (state: FormState) => void, options?: { immediate?: boolean }): Unsubscribe
```

Registers a callback that fires with the latest `FormState` snapshot whenever any field changes. Returns an unsubscribe function. The callback fires immediately on registration unless `immediate: false` is set.

```ts
type Unsubscribe = () => void;
```

### `watch(name, listener, options?)`

```ts
watch(
  name: string,
  listener: (state: FieldState) => void,
  options?: { immediate?: boolean },
): Unsubscribe
```

Registers a callback that fires with the latest `FieldState` snapshot whenever **only that field** changes. More efficient than `subscribe` when you only care about one field. Fires immediately on registration unless `immediate: false` is set.

## Lifecycle

### `dispose()`

```ts
dispose(): void
```

Aborts all in-flight validators, removes all subscribers, and marks the form as `disposed`. A disposed form will not accept further changes.

## Error Classes

### `FormValidationError`

Thrown by `submit()` when validation fails.

```ts
class FormValidationError extends Error {
  readonly type = 'validation';
  /** All field errors at the time of failure */
  readonly errors: Record<string, string>;
}
```

### `SubmitError`

Thrown by `submit()` when called while the form is already submitting.

```ts
class SubmitError extends Error {
  readonly type = 'submit';
}
```

## Standalone Utilities

### `toFormData(values)`

```ts
function toFormData(values: Record<string, unknown>): FormData;
```

Converts a plain values object into a `FormData` instance. `File` and `Blob` values are appended as-is. `null` and `undefined` values are omitted. All other values are converted to strings via `.toString()`.

The same functionality is available as an instance method (`form.toFormData()`) which uses the current `form.values()` snapshot.

### `fromSchema(schema)`

```ts
function fromSchema<TValues>(schema: SafeParseSchema): Pick<FormOptions<TValues>, 'validator'>;
```

Adapts any `safeParse`-compatible schema (Zod, Valibot, or custom) as a form-level validator. Returns `{ validator: ... }` which you spread into `createForm()` options.

```ts
/** Structural type for any safeParse-compatible schema. */
interface SafeParseSchema {
  safeParse(
    data: unknown,
  ): { success: true } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
}
```

```ts
import { z } from 'zod';
const schema = z.object({ email: z.string().email(), age: z.number().min(18) });

const form = createForm({
  defaultValues: { email: '', age: 0 },
  ...fromSchema(schema),
});
```

## Exported Types

```ts
// Instance
export type { Form }; // Full form interface
export type { FormOptions }; // createForm() init options
export type { FormState }; // Snapshot from form.state / subscribe

// Field
export type { FieldState }; // Snapshot from form.field() / watch()
export type { BindResult }; // Returned by form.bind()

// Validators
export type { FieldValidator }; // (value: V, signal: AbortSignal) => string | undefined | Promise<...>
export type { FormValidator }; // (values: TValues, signal: AbortSignal) => Record<string, string> | Promise<...>
export type { SafeParseSchema }; // Structural type for safeParse-compatible schemas

// Operation results and options
export type { ValidateResult };
export type { ValidateOptions };
export type { SetOptions };
export type { SubmitOptions };
export type { BindConfig };

// Utility types
export type { FlatKeyOf }; // Recursive dot-notation key union of a TValues shape
export type { TypeAtPath }; // Value type at a dot-notation path
export type { Unsubscribe }; // () => void
```
