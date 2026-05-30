---
title: Forge — API Reference
description: Complete API reference for Forge form creation, validation, submission, subscriptions, connect, scope, and browser helpers.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| ------ | ------- | -------------- | ------------- |
| `createForm()` | Create a typed form controller | Sync (async when `defaultValues` is a factory) | Infer `TValues` from `defaultValues`; explicit type param needed for dynamic shapes |
| `form.get()` / `form.set()` | Read/write field values by dot-path | Sync | `set()` after `dispose()` throws |
| `form.field()` / `form.state` | Read field and form snapshots | Sync | Returns a stable frozen snapshot; re-read on each subscriber call |
| `form.validate()` / `form.validateFields()` / `form.validateField()` | Run validation for all, selected, or one field | Async | Each call re-runs validators from scratch; previous abort signals are ignored |
| `form.submit()` | Deterministic submit flow returning a `SubmitResult` | Async | Throws if called while already submitting — guard with `state.isSubmitting` |
| `form.connect()` | Live field binding with DOM event handlers and live getters | Sync | Do not destructure — live getters lose context |
| `form.scope()` | Scoped sub-form with relative field paths | Sync | `state.touchedFields` still uses full paths; use `scope.validate()` not `scope.validateFields([...state.touchedFields])` |
| `form.array()` | Array mutation helpers | Sync | Returns a cached helper — call once and reuse |
| `form.subscribe()` / `form.subscribeField()` | Synchronous form and field subscriptions | Sync | Callbacks receive frozen snapshots; mutations inside callbacks are batched |
| `form.batch()` | Group mutations into one notification | Sync | Nested `batch()` calls are safe — only the outermost flush notifies |
| `form.touch()` / `form.touchAll()` | Mark fields touched | Sync | `touchAll()` marks every key currently in the store |
| `form.setError()` / `form.clearError()` / `form.resetErrors()` | Manual error management | Sync | `setError()` bypasses validators; cleared on next `validate()` run for that field |
| `form.reset()` / `form.replace()` / `form.patch()` / `form.removeField()` | Baseline and value management | Sync | `replace()` updates the baseline; `reset()` restores to it |
| `schemaValidator()` | Adapt a `safeParse` schema into a `FormValidator` | Sync | Pass `schema` directly to `validator` instead for auto-detection |
| `toFormData()` | Serialize nested values to `FormData` | Sync | Nested objects are dot-path serialized; `File` values are passed through |
| `ValidationModes` | Named presets for `connect()` validation triggers | — | Pass as `connect` option in `createForm()` for a global default |
| `FORM_ERROR` | Reserved key `'_form'` for root-level errors | — | Use with `setError(FORM_ERROR, msg)` or `form.validator` return value |

## Package Entry Points

| Entry | Purpose |
| ----- | ------- |
| `@vielzeug/forge` | `createForm`, `schemaValidator`, `toFormData`, `ValidationModes`, `FORM_ERROR`, and all types |
| `@vielzeug/forge/react` | `createForgeHooks`, `ForgeHooks`, `UseSyncExternalStoreFn` |
| `@vielzeug/forge/vue` | `createForgeComposables`, `ForgeComposables`, `ShallowRefFn`, `OnScopeDisposeFn`, `VueReadonlyRef` |
| `@vielzeug/forge/svelte` | `formState`, `fieldStore`, `formValues`, `SvelteReadable` |

---

## createForm()

```ts
function createForm<TValues extends Record<string, unknown>>(
  init?: FormOptions<TValues>
): Form<TValues>;
```

Creates a typed form controller. `TValues` is inferred from `defaultValues` when provided.

### FormOptions

```ts
type FormOptions<TValues> = {
  /** Initial values. May be a static object or an async factory. */
  defaultValues?: TValues | (() => Promise<TValues>);

  /** Field-level validators keyed by dot-notation path. */
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator>>;

  /**
   * Form-level validator. Accepts a FormValidator function or any safeParse-
   * compatible schema (auto-detected — works with @vielzeug/spell, Zod, Valibot).
   */
  validator?: FormValidator<TValues> | SafeParseSchema;

  /**
   * Default connect() behavior. Use ValidationModes presets:
   *   ValidationModes.onSubmit (default) — validates only on submit
   *   ValidationModes.onBlur  — validates on blur
   *   ValidationModes.onChange — validates on every change
   *   ValidationModes.onTouched — blur first, then change once touched
   */
  connect?: ConnectOptions;
};
```

Async `defaultValues` factory — `state.isLoading` / `form.isLoading` is `true` while the factory is pending.

---

## Values

### form.get(name)

```ts
get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>
```

Returns the stored value for a field path. Returns `undefined` for unknown paths.

### form.set(name, value, options?)

```ts
set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void

type SetOptions = {
  dirty?: boolean;   // default: true
  touched?: boolean; // default: false
};
```

### form.values()

```ts
values(): TValues
```

Returns the full nested values object (reconstructed from the flat store).

### form.patch(partial)

```ts
patch(partial: DeepPartial<TValues>): void
```

Merges a partial object into both the store and the baseline, marking the affected fields clean. Useful for applying server-returned data without dirtying the form.

---

## State Access

### form.field(name)

```ts
field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>

type FieldState<V = unknown> = {
  value: V;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
};
```

Returns a frozen, cached snapshot. The reference stays stable until that field changes.

### form.state

```ts
readonly state: FormState

type FormState = {
  errors: Readonly<Record<string, string>>;
  isDirty: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
  /**
   * Full dot-notation paths of all currently touched fields.
   * On a scoped form these are still full paths (e.g. "address.city", not "city").
   * Prefer scope.validate() rather than scope.validateFields([...state.touchedFields]).
   */
  touchedFields: readonly string[];
  /** Paths of fields with an active async validation run. */
  validatingFields: readonly string[];
};
```

### form.isLoading

```ts
readonly isLoading: boolean
```

`true` while an async `defaultValues` factory is resolving. Mirrors `state.isLoading`.

---

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

- `setError` — set one field error (does not clear the value).
- `clearError` — remove one field error.
- `resetErrors` — replace the full error map; omit entries with `undefined` values.
- `setValidator` — add, replace, or remove a field validator. Removing (`undefined`) immediately clears that field's error.
- `touch` / `untouch` / `touchAll` / `untouchAll` — manage touched state.

---

## Validation

```ts
validate(signal?: AbortSignal): Promise<ValidateResult>
validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>
validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>

type ValidateResult = {
  valid: boolean;
  errors: Readonly<Record<string, string>>;
};
```

- `validate()` — runs all registered field validators plus the form-level validator.
- `validateFields([...])` — runs only the specified fields (no form-level validator).
- `validateField(name)` — runs one field's validator; returns the error string or `undefined`.

`errors` reflects the full current error map after the run. `valid` is `true` only when `errors` is empty after the run.

---

## submit()

```ts
submit<TResult = void>(
  handler: (values: TValues) => MaybePromise<TResult>,
): Promise<SubmitResult<TResult>>

type SubmitResult<T> =
  | { ok: true; value: T }
  | { ok: false; type: 'validation'; errors: Record<string, string> };
```

Submit behavior:

1. Marks all known fields touched
2. Runs full validation
3. If invalid: returns `{ ok: false, type: 'validation', errors }`
4. If valid: calls `handler(values())` and returns `{ ok: true, value }`

`submit()` always resolves — it never throws for validation failures. Exceptions thrown inside `handler` propagate normally. Calling `submit()` while `state.isSubmitting` is `true` throws synchronously.

---

## connect()

```ts
connect<K extends FlatKeyOf<TValues>>(
  name: K,
  config?: ConnectOptions,
): ConnectionResult<TypeAtPath<TValues, K>>

type ConnectOptions = {
  debounce?: number;          // debounce auto-validation by this many ms (default: 0)
  touchOnBlur?: boolean;      // mark field touched on blur (default: true)
  validateOnBlur?: boolean;   // validate on blur (default: false)
  validateOnChange?: boolean; // validate on every change (default: false)
  validateOnTouch?: boolean;  // validate on change only after first touch (default: false)
};

type ConnectionResult<V = unknown> = {
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
  onBlur(): void;
  onChange(value: V): void;
};
```

Call once per field and store the result. Do not destructure — getters re-evaluate on every property access.

### ValidationModes

Named presets for `ConnectOptions`. Pass to `createForm({ connect: ... })` or to individual `connect()` calls.

```ts
import { ValidationModes } from '@vielzeug/forge';

ValidationModes.onSubmit  // { touchOnBlur: true }
ValidationModes.onBlur    // { touchOnBlur: true, validateOnBlur: true }
ValidationModes.onChange  // { touchOnBlur: true, validateOnChange: true }
ValidationModes.onTouched // { touchOnBlur: true, validateOnBlur: true, validateOnTouch: true }
```

---

## scope()

```ts
scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>>
```

Returns a scoped sub-form whose field paths are relative to `prefix`. **Call once and store the result** — each call creates a new object.

```ts
const address = form.scope('address');

address.get('city');                  // → form.get('address.city')
address.set('city', 'Portland');      // → form.set('address.city', 'Portland')
address.validate();                   // validates only address.* fields; errors have relative keys
address.submit((vals) => save(vals)); // validates and submits only address.* scope
```

**Characteristics:**

- `dispose()` on a scoped form is a no-op. Call `parentForm.dispose()` to tear down.
- `state` is shared — `state.errors`, `state.isValid`, `state.touchedFields`, and `state.isDirty` reflect the **entire** form, not just the scoped fields. Use `scope.validate()` or `scope.submit()` for scoped validity.
- `validate()` and `submit()` return errors with relative keys (no prefix) and a `valid` flag reflecting only the scoped fields.
- `validateFields([...])` on a scoped form also returns relative keys and a scoped `valid` flag.

---

## Subscriptions

```ts
subscribe(
  listener: (state: FormState) => void,
  options?: SubscribeOptions,
): Unsubscribe

subscribeField<K extends FlatKeyOf<TValues>>(
  name: K,
  listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
  options?: SubscribeOptions,
): Unsubscribe

type SubscribeOptions = { sync?: boolean };
type Unsubscribe = () => void;
```

Pass `{ sync: true }` to also receive the current snapshot immediately upon subscription.

Subscriptions fire synchronously whenever the form mutates. Because state snapshots are stable (frozen, reference-equal between mutations), these integrate directly with React `useSyncExternalStore`, Vue `shallowRef`, and the Svelte store protocol.

---

## Arrays

```ts
array(name: FlatKeyOf<TValues>): ArrayField

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

`form.array(name)` returns a cached helper — the same object is returned on repeated calls with the same name.

---

## Reset, Replace, Patch, and Remove

```ts
reset(): void
replace(newValues: TValues): void
patch(partial: DeepPartial<TValues>): void
resetField(name: FlatKeyOf<TValues>): void
removeField(name: FlatKeyOf<TValues>): void
```

- `reset()` — restore all values to the current baseline; clear errors, touched, and dirty state. Aborts in-flight validation.
- `replace(newValues)` — replace values **and** the baseline in one operation. Aborts in-flight validation.
- `patch(partial)` — merge specific fields into the store and baseline; those fields become clean.
- `resetField(name)` — restore one field to its baseline value; clear its error, touched, and dirty state.
- `removeField(name)` — drop a field entirely: value, dirty, touched, error, and validator.

---

## Lifecycle

```ts
dispose(): void
readonly disposed: boolean
```

After `dispose()`, all mutating APIs throw. In-flight validation is aborted. Subscriptions are cleared.

---

## batch()

```ts
batch(fn: () => void): void
```

Batches all mutations inside `fn` into a single subscriber notification. Notifications always flush at the end — even if `fn` throws.

---

## Framework Adapters

### React (`@vielzeug/forge/react`)

```ts
import { useSyncExternalStore } from 'react';
import { createForgeHooks } from '@vielzeug/forge/react';
import type { ForgeHooks } from '@vielzeug/forge/react';

const hooks: ForgeHooks = createForgeHooks(useSyncExternalStore);

const { useField, useFormState, useFormValues } = hooks;
```

- `useFormState(form)` — subscribes to the full `FormState`. Re-renders when any state changes.
- `useField(form, name)` — subscribes to a single field. Re-renders only when that field changes.
- `useFormValues(form)` — subscribes to all values. Re-renders when any field value changes.

### Vue (`@vielzeug/forge/vue`)

```ts
import { onScopeDispose, shallowRef } from 'vue';
import { createForgeComposables } from '@vielzeug/forge/vue';
import type { ForgeComposables } from '@vielzeug/forge/vue';

const composables: ForgeComposables = createForgeComposables({ shallowRef, onScopeDispose });

const { useField, useFormState, useFormValues } = composables;
```

Each composable returns a `VueReadonlyRef<T>` and auto-disposes the subscription when the enclosing Vue scope (component or `effectScope`) is torn down.

### Svelte (`@vielzeug/forge/svelte`)

```ts
import { createForm } from '@vielzeug/forge';
import { formState, fieldStore, formValues } from '@vielzeug/forge/svelte';

const form = createForm({ defaultValues: { email: '' } });
const state = formState(form);    // SvelteReadable<FormState>
const email = fieldStore(form, 'email');  // SvelteReadable<FieldState<string>>
const values = formValues(form);  // SvelteReadable<TValues>
```

Each helper returns a Svelte `readable`-compatible store (implements `subscribe`) and fires immediately with the current snapshot on subscription.

---

## Standalone Utilities

### schemaValidator()

```ts
function schemaValidator<TValues extends Record<string, unknown>>(
  schema: SafeParseSchema,
): FormValidator<TValues>
```

Wraps a `safeParse`-compatible schema as a `FormValidator`. Root-level issues (path `[]`) are stored under `FORM_ERROR` (`'_form'`). When multiple issues target the same path, the first wins.

> **Tip:** Passing a schema directly to `createForm({ validator: mySchema })` achieves the same result via auto-detection. Use `schemaValidator(schema)` explicitly when you need custom error filtering or transformation.

### toFormData()

```ts
function toFormData(values: Record<string, unknown>): FormData
```

Serializes a nested values object to `FormData`. Nested keys are flattened with dot notation. `File`, `Blob`, and `FileList` values are appended as-is; all others are coerced to strings. `null` and `undefined` are skipped.

---

## Types

```ts
// Core
type Form<TValues extends Record<string, unknown>>
type FormOptions<TValues>
type FormState
type FieldState<V>
type ValidateResult
type SubmitResult<T>
type SetOptions
type SubscribeOptions
type Unsubscribe
type MaybePromise<T>

// Validation
type FieldValidator<V>
type FormValidator<TValues>
type SafeParseSchema
type ConnectOptions
type ConnectionResult<V>
const ValidationModes  // named presets object — not a type
const FORM_ERROR       // string constant '_form' — not a type

// Utility types
type FlatKeyOf<TValues>
type TypeAtPath<TValues, K>
type ErrorKeyOf<TValues>
type ScopedValues<TValues, P>

// React adapter
type ForgeHooks
type UseSyncExternalStoreFn

// Vue adapter
type ForgeComposables
type ShallowRefFn
type OnScopeDisposeFn
type VueReadonlyRef<T>

// Svelte adapter
type SvelteReadable<T>
```

## Errors

Forge does not export error classes. Validation failures are returned as result objects rather than thrown errors:

- `form.submit()` returns `{ ok: false, type: 'validation', errors }` — it never throws for validation failures.
- `form.validate()` and `form.validateFields()` return `{ valid: boolean, errors }`.
- The only thrown exceptions are programming errors: calling mutating APIs after `dispose()`, or calling `submit()` while already submitting.
