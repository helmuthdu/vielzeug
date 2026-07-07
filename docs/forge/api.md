---
title: Forge — API Reference
description: Complete API reference for Forge form creation, validation, submission, subscriptions, connect, scope, and browser helpers.
---

[[toc]]

## API Overview

| Symbol                                                                      | Purpose                                                        | Execution mode                                 | Common gotcha                                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `createForm()`                                                              | Create a typed form controller                                 | Sync (async when `defaultValues` is a factory) | Infer `TValues` from `defaultValues`; explicit type param needed for dynamic shapes                                   |
| `form.get()` / `form.set()`                                                 | Read/write field values by dot-path                            | Sync                                           | `set()` after `dispose()` throws                                                                                      |
| `form.field()` / `form.state`                                               | Read field and form snapshots                                  | Sync                                           | Returns a stable frozen snapshot; re-read on each subscriber call                                                     |
| `form.validate()`                                                           | Run validation — all fields, a subset, or a single field       | Async                                          | Each call re-runs validators from scratch                                                                             |
| `form.validateStream()`                                                     | Streaming validation — yields each field result as it resolves | Async (iterator)                               | Read-only — does not write errors to form state                                                                       |
| `form.submit()`                                                             | Deterministic submit flow returning a `SubmitResult`           | Async                                          | Rejects if called while already submitting — guard with `form.isSubmitting`                                           |
| `form.connect()`                                                            | Live field binding with DOM event handlers and live getters    | Sync                                           | Do not destructure — live getters lose context; call `dispose()` on unmount                                           |
| `form.scope()`                                                              | Memoized scoped sub-form with relative field paths             | Sync                                           | Returns the same object for repeated calls with the same prefix; `state` is scoped — flags reflect only prefix fields |
| `form.array()`                                                              | Array mutation helpers                                         | Sync                                           | Returns a cached helper — call once and reuse                                                                         |
| `form.subscribe()` / `form.subscribeField()` / `form.subscribeScoped()`     | Synchronous form and field subscriptions                       | Sync                                           | Callbacks receive frozen snapshots                                                                                    |
| `form.snapshot()` / `form.restore()`                                        | Capture and replay complete form state                         | Sync                                           | Useful for undo/redo and draft saving                                                                                 |
| `form.batch()`                                                              | Group mutations into one notification                          | Sync                                           | Nested `batch()` calls are safe — only the outermost flush notifies                                                   |
| `form.touch()` / `form.touchAll()`                                          | Mark fields touched                                            | Sync                                           | `touchAll()` marks every key currently in the store                                                                   |
| `form.setError()` / `form.clearError()` / `form.resetErrors()`              | Manual error management                                        | Sync                                           | `setError()` bypasses validators; cleared on next `validate()` run for that field                                     |
| `form.reset()` / `form.replace()` / `form.patch()` / `form.fields.remove()` | Baseline and value management                                  | Sync                                           | `replace()` updates the baseline; `reset()` restores to it                                                            |
| `form.fields.list()`                                                        | Enumerate currently-known field paths                           | Sync                                           | Scoped forms return prefix-relative paths, not absolute paths like `state.touchedFields`                              |
| `toFormData()`                                                              | Serialize nested values to `FormData`                          | Sync                                           | Nested objects are dot-path serialized; `File` values are passed through                                              |
| `ValidationModes`                                                           | Named presets for `connect()` validation triggers              | —                                              | Pass as `connect` option in `createForm()` for a global default                                                       |
| `FORM_ERROR`                                                                | Reserved key `'_form'` for root-level errors                   | —                                              | Use with `setError(FORM_ERROR, msg)` or `form.validator` return value                                                 |
| `form[Symbol.asyncIterator]()`                                              | Iterate form state changes with `for await...of`               | Async (iterator)                               | Iterator completes when `dispose()` is called                                                                         |

## Package Entry Points

| Entry                        | Purpose                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `@vielzeug/forge`            | `createForm`, `toFormData`, `ValidationModes`, `FORM_ERROR`, and all types          |
| `@vielzeug/forge/validators` | `fieldValidator`, `composeValidators` — schema and validator composition helpers    |
| `@vielzeug/forge/devtools`   | `debugForm` — opt-in `console.debug` logging for form state transitions   |

## createForm()

```ts
function createForm<TValues extends Record<string, unknown>>(init?: FormOptions<TValues>): Form<TValues>;
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

  /** Called when the async defaultValues factory rejects. Useful for surfacing load errors. */
  onLoadError?: (error: unknown) => void;
};
```

Async `defaultValues` factory — `state.isLoading` / `form.isLoading` is `true` while the factory is pending.

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

## State Access

### form.field(name)

```ts
field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>

type FieldState<V = unknown> = {
  value: V;
  error: string | undefined;
  /** Convenience alias — `true` when `error` is not `undefined`. */
  hasError: boolean;
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
   * Prefer scope.validate() rather than scope.validate([...state.touchedFields]).
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

### form.isSubmitting

```ts
readonly isSubmitting: boolean
```

`true` while a `submit()` call is in progress. Mirrors `state.isSubmitting`. Useful for guarding against concurrent submissions without subscribing to form state.

## Error and Touched Management

```ts
setError(name: ErrorKeyOf<TValues>, message: string): void
clearError(name: ErrorKeyOf<TValues>): void
resetErrors(errors?: Partial<Record<ErrorKeyOf<TValues>, string | undefined>>): void
touch(name: FlatKeyOf<TValues>): void
untouch(name: FlatKeyOf<TValues>): void
touchAll(): void
untouchAll(): void
```

- `setError` — set one field error (does not clear the value).
- `clearError` — remove one field error.
- `resetErrors` — replace the full error map; omit entries with `undefined` values.
- `touch` / `untouch` / `touchAll` / `untouchAll` — manage touched state.

To manage validators dynamically see [`form.fields`](#formfields).

## Validation

All three variants share a single unified method:

```ts
// All fields + form-level validator
validate(signal?: AbortSignal): Promise<ValidateResult>

// Single named field (no form-level validator)
validate(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<ValidateResult>

// Specific subset of fields (no form-level validator)
validate(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>

type ValidateResult = {
  valid: boolean;
  errors: Readonly<Record<string, string>>;
};
```

- `validate()` — runs all registered field validators plus the form-level validator.
- `validate(name)` — runs one field's validator; `errors` contains at most one entry.
- `validate(fields[])` — runs only the specified fields (no form-level validator).

`valid` is `true` only when `errors` is empty after the run.

## submit() / submitOrThrow()

```ts
submit<TResult = void>(
  handler: (values: TValues) => MaybePromise<TResult>,
): Promise<SubmitResult<TResult>>

submitOrThrow<TResult = void>(
  handler: (values: TValues) => MaybePromise<TResult>,
): Promise<TResult>

type SubmitResult<T> =
  | { ok: true; value: T }
  | { ok: false; type: 'validation'; errors: Record<string, string> };
```

Submit behavior:

1. Marks all known fields touched
2. Runs full validation
3. If invalid: returns `{ ok: false, type: 'validation', errors }` / throws `ForgeValidationError`
4. If valid: calls `handler(values())` and returns `{ ok: true, value }` / resolves with the handler return value

`submit()` always resolves — it never throws for validation failures. Exceptions thrown inside `handler` propagate normally.

`submitOrThrow()` throws a `ForgeValidationError` when validation fails. Exceptions thrown inside `handler` propagate as-is (not wrapped).

Both methods are `async function`s. Calling either while `state.isSubmitting` is `true` rejects the returned promise with a `ForgeSubmitError` — since they're async, `await` (or `.catch()`) the call to observe the error; it is not thrown synchronously.

## connect()

```ts
connect<K extends FlatKeyOf<TValues>>(
  name: K,
  config?: ConnectOptions,
): ConnectionResult<TypeAtPath<TValues, K>>

type ConnectOptions = {
  debounce?: number;          // debounce auto-validation by this many ms (default: 0)
  touchOnBlur?: boolean;      // mark field touched on blur (default: false)
  validateOnBlur?: boolean;   // validate on blur (default: false)
  validateOnChange?: boolean; // validate on every change (default: false)
  validateOnTouch?: boolean;  // validate on change only after first touch (default: false)
};

type ConnectionResult<V = unknown> = {
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
  /** true after dispose() has been called on this binding. */
  readonly disposed: boolean;
  onBlur(): void;
  onChange(value: V): void;
  /** Cancel any pending debounce timer owned by this binding. Call on field unmount. */
  dispose(): void;
  [Symbol.dispose](): void;
};
```

Call once per field and store the result. Do not destructure — getters re-evaluate on every property access. Each `connect()` call creates its own independent debounce timer; cancelling one binding does not affect others. Call `dispose()` when the field unmounts to avoid stale timer fires. Supports `using` declarations.

### ValidationModes

Named presets for `ConnectOptions`. Pass to `createForm({ connect: ... })` or to individual `connect()` calls.

```ts
import { ValidationModes } from '@vielzeug/forge';

ValidationModes.onSubmit; // {} — no automatic touch or validation
ValidationModes.onBlur; // { touchOnBlur: true, validateOnBlur: true }
ValidationModes.onChange; // { touchOnBlur: true, validateOnChange: true }
ValidationModes.onTouched; // { touchOnBlur: true, validateOnBlur: true, validateOnTouch: true }
```

## scope()

```ts
scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>>
```

Returns a memoized scoped sub-form whose field paths are relative to `prefix`. Repeated calls with the same prefix return the **same cached object** — no need to store the result yourself, though it is still good practice.

```ts
const address = form.scope('address');

address.get('city'); // → form.get('address.city')
address.set('city', 'Portland'); // → form.set('address.city', 'Portland')
address.validate(); // validates only address.* fields; errors have relative keys
address.submit((vals) => save(vals)); // validates and submits only address.* scope
```

**Characteristics:**

- `dispose()` on a scoped form is a no-op. Call `parentForm.dispose()` to tear down.
- `scope.state` returns a **scoped projection**: `errors`, `touchedFields`, `validatingFields`, `isDirty`, `isValid`, `isTouched`, and `isValidating` reflect only fields within the scope's prefix. `isSubmitting`, `isLoading`, and `submitCount` reflect the full form.
- `validate()`, `validate(name)`, `validate(fields[])`, and `submit()` / `submitOrThrow()` return errors with relative keys (no prefix) and a `valid` / throw that reflects only the scoped fields.
- Memoized — `scope(prefix)` always returns the same object; safe to call on every render.

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

subscribeScoped(
  listener: (state: FormState) => void,
  options?: SubscribeOptions,
): Unsubscribe

type SubscribeOptions = { sync?: boolean };
type Unsubscribe = () => void;
```

Pass `{ sync: true }` to also receive the current snapshot immediately upon subscription.

Subscriptions fire synchronously whenever the form mutates. Because state snapshots are stable (frozen, reference-equal between mutations), these integrate directly with React `useSyncExternalStore`, Vue `shallowRef`, and the Svelte store protocol.

### subscribeScoped

`subscribeScoped` is available on both root forms and scoped forms:

- **On a scoped form** — filters `errors`, `touchedFields`, and `validatingFields` to paths within the scope's prefix (remapped to relative paths). The listener is **only called when the scoped projection changes** — mutations outside the scope are suppressed. `isDirty`, `isValid`, `isTouched`, and `isValidating` reflect **only the scoped fields**. `isSubmitting`, `isLoading`, and `submitCount` reflect the full form.
- **On a root form** — behaves identically to `subscribe`; no filtering is applied.

```ts
const address = form.scope('address');

address.subscribeScoped((state) => {
  // state.errors uses relative keys: { city: '...' } not { 'address.city': '...' }
  // only fires when an address.* field changes
  console.log(state.errors, state.touchedFields);
});
```

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

`append()` and `prepend()` initialize the field as a one-item array when its current value is `undefined` or `null`. If the field already holds a non-array, non-nullish value (e.g. written by `set()`), both are a no-op — they never overwrite an existing scalar with an array. `insert()`, `remove()`, `move()`, `swap()`, and `replace()` are all no-ops when the field's current value is not an array.

## Snapshot / Restore

```ts
snapshot(): FormSnapshot<TValues>
restore(snap: FormSnapshot<TValues>): void

type FormSnapshot<TValues> = {
  readonly baseline: Partial<Record<FlatKeyOf<TValues>, unknown>>;
  readonly dirty: readonly string[];
  readonly errors: Readonly<Record<string, string>>;
  readonly store: Partial<Record<FlatKeyOf<TValues>, unknown>>;
  readonly submitCount: number;
  readonly touched: readonly string[];
};
```

- `snapshot()` — captures the complete form state (values, baseline, errors, touched, dirty, submitCount) into a plain object.
- `restore(snap)` — replaces all state with the snapshot. Aborts any in-flight validation.

Useful for undo/redo, draft saving, and "discard changes" flows:

```ts
const draft = form.snapshot();

form.set('email', 'changed@example.com');

form.restore(draft); // reverts all changes
```

## validateStream()

```ts
validateStream(signal?: AbortSignal): AsyncIterableIterator<{
  error: string | undefined;
  field: string;
}>
```

Runs all field validators in parallel and yields each result as soon as its validator resolves. If a form-level validator is configured, all keys it returns are yielded last — including `field: '_form'` and any field-specific keys returned by the form validator.

**Read-only**: `validateStream()` does not write to `fieldErrors` or trigger subscriber notifications. Use `validate()` when you want errors applied to form state.

```ts
for await (const { field, error } of form.validateStream()) {
  if (error) showInlineError(field, error);
}
// After the loop: form.state.errors is unchanged
```

Pass an `AbortSignal` to cancel the stream:

```ts
const ctrl = new AbortController();
for await (const result of form.validateStream(ctrl.signal)) {
  processResult(result);
}
ctrl.abort(); // cancels any remaining in-flight validators
```

## Baseline and Value Management

```ts
reset(): void
replace(newValues: TValues): void
patch(partial: DeepPartial<TValues>): void
resetField(name: FlatKeyOf<TValues>): void
```

- `reset()` — restore all values to the current baseline; clear errors, touched, dirty, and `submitCount`. Aborts in-flight validation.
- `replace(newValues)` — replace values **and** the baseline in one operation; resets `submitCount` to `0`. Aborts in-flight validation.
- `patch(partial)` — merge specific fields into the store and baseline; those fields become clean.
- `resetField(name)` — restore one field to its baseline value; clear its error, touched, and dirty state.

## form.fields

Namespace for dynamic field lifecycle management.

```ts
form.fields: {
  list(): readonly string[];
  register<K extends FlatKeyOf<TValues>>(
    name: K,
    options?: RegisterFieldOptions<TypeAtPath<TValues, K>>,
  ): Unsubscribe;
  remove(name: FlatKeyOf<TValues>): void;
  setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator): void;
}

type RegisterFieldOptions<V> = {
  defaultValue?: V;
  validator?: FieldValidator<V>;
};
```

- `fields.list()` — enumerate all currently-known field paths: the deduplicated union of populated store keys and keys with a registered validator (the same definition `touchAll()` uses).
- `fields.register(name, opts?)` — declare a dynamic field with an optional default value and validator. Returns an unregister callback that calls `fields.remove()` on the same field. If the field already exists, `defaultValue` is ignored.
- `fields.remove(name)` — drop a field entirely: value, dirty, touched, error, and validator.
- `fields.setValidator(name, validator?)` — add, replace, or remove a field validator. Removing (`undefined`) immediately clears that field's error.

On a scoped form, all paths are relative:

```ts
const address = form.scope('address');
const unsub = address.fields.register('zip', { defaultValue: '' });
// Equivalent to: form.fields.register('address.zip', { defaultValue: '' })

address.fields.list(); // ['zip'] — relative to the scope's prefix, not ['address.zip']
```

## Lifecycle

```ts
dispose(): void
readonly disposed: boolean
readonly disposalSignal: AbortSignal
```

After `dispose()`, all mutating APIs throw. In-flight validation is aborted. Subscriptions are cleared.

`disposalSignal` is aborted when `dispose()` is called. Pass it to validators or other async work that should be cancelled when the form tears down.

## Async Iteration

```ts
[Symbol.asyncIterator](): AsyncIterableIterator<FormState>
```

Makes the form directly iterable with `for await...of`. Each iteration yields the current `FormState` snapshot whenever the form changes. The iterator completes when `dispose()` is called.

```ts
for await (const state of form) {
  renderUI(state);
  if (state.submitCount > 0 && state.isValid) break;
}
// Iterator completes automatically when form.dispose() is called
```

> Each `for await...of` loop creates an independent iterator — multiple concurrent loops are supported.

## batch()

```ts
batch(fn: () => void): void
```

Batches all mutations inside `fn` into a single subscriber notification. Notifications always flush at the end — even if `fn` throws.

## Validators (`@vielzeug/forge/validators`)

> Forge has no framework-specific sub-paths — `form.subscribe()`, `form.subscribeField()`, and `form.connect()` are the framework-agnostic primitives every integration is built on. See [Usage → Framework Integration](./usage.md#framework-integration) for copy-pasteable React/Vue/Svelte recipes.

```ts
import { composeValidators, fieldValidator } from '@vielzeug/forge/validators';
import { s } from '@vielzeug/spell';

// Wrap a safeParse-compatible field schema into a FieldValidator
const emailValidator = fieldValidator(s.string().email('Invalid email'));

// Chain multiple validators — short-circuits on the first error
const passwordValidator = composeValidators(
  fieldValidator(s.string().min(8, 'At least 8 characters')),
  async (value, signal) => {
    const breached = await checkBreachedPasswords(value, signal);
    return breached ? 'Password found in breach database' : undefined;
  },
);

const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: { email: emailValidator, password: passwordValidator },
});
```

- `fieldValidator(schema)` — wraps any `safeParse`-compatible schema as a `FieldValidator`. The first issue message becomes the field error.
- `composeValidators(...validators)` — chains validators in order, stopping at the first error. Abort signals are respected between steps.

## Devtools (`@vielzeug/forge/devtools`)

Opt-in `console.debug` logging for form state transitions. Not exported from the main `@vielzeug/forge` entry point — import from this sub-path so the logging code is tree-shaken from production bundles.

```ts
function debugForm<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  options?: ForgeDevtoolsOptions,
): Unsubscribe;

type ForgeDevtoolsOptions = {
  label?: string; // included in every log line; default: 'form'
};
```

Logs one line per observable state transition: per-field `value`/`error`/`touched`/`dirty` changes, `isSubmitting` edges (submit start/end), and `isLoading` edges (async `defaultValues` resolving). Works identically on scoped sub-forms — field paths logged are relative to whatever `form` object is passed in, matching that form's own `state` convention.

**Development only:** a no-op when `__FORGE_PROD__` is set on `globalThis` — the same convention forge's internal `_dev.ts` warnings use.

```ts
import { createForm } from '@vielzeug/forge';
import { debugForm } from '@vielzeug/forge/devtools';

const form = createForm({ defaultValues: { email: '' } });
const detach = debugForm(form, { label: 'signup' });
// [forge:devtools:signup] field "email" value: "" → "a@b.com"

detach(); // stop logging
```

## Standalone Utilities

### toFormData()

```ts
function toFormData(values: Record<string, unknown>): FormData;
```

Serializes a nested values object to `FormData`. Nested keys are flattened with dot notation. `File`, `Blob`, and `FileList` values are appended as-is; all others are coerced to strings. `null` and `undefined` are skipped.

## Types

```ts
// Core
type Form<TValues extends Record<string, unknown>>
type FormOptions<TValues>
type FormState
type FieldState<V>
type FormSnapshot<TValues>
type RegisterFieldOptions<V>
type ValidateResult
type SubmitResult<T>
type SetOptions
type SubscribeOptions
type Unsubscribe
type MaybePromise<T>
class ForgeError            // base class — instanceof / ForgeError.is() catches any forge error
class ForgeConfigError      // unsafe __proto__/constructor/prototype key
class ForgeDisposedError    // mutating call after dispose()
class ForgeSubmitError      // submit()/submitOrThrow() called while already submitting
class ForgeValidationError  // thrown by submitOrThrow() on validation failure

// Validation
type FieldValidator<V>
type FormValidator<TValues>
type SafeParseSchema
type ConnectOptions
type ConnectionResult<V>
const ValidationModes  // named presets object — not a type
const FORM_ERROR       // string constant '_form' — not a type

// Devtools (@vielzeug/forge/devtools)
type ForgeDevtoolsOptions

// Utility types
type DeepPartial<T>
type FlatKeyOf<TValues>
type TypeAtPath<TValues, K>
type ErrorKeyOf<TValues>
type ScopedValues<TValues, P>
```

## Errors

Forge exports a small typed error hierarchy, all extending a common `ForgeError` base:

```ts
class ForgeError extends Error {
  static is(err: unknown): err is ForgeError;
}

class ForgeConfigError extends ForgeError {}
class ForgeDisposedError extends ForgeError {}
class ForgeSubmitError extends ForgeError {}

class ForgeValidationError extends ForgeError {
  readonly errors: Record<string, string>;
}
```

- `ForgeError` — base class. Use `instanceof ForgeError` or the static `ForgeError.is(err)` to catch any forge-originated error.
- `ForgeConfigError` — thrown when a form key contains a reserved prototype-polluting segment (`__proto__`, `constructor`, or `prototype`), e.g. from `form.set('__proto__', ...)`.
- `ForgeDisposedError` — thrown when a mutating method (e.g. `set()`, `submit()`, `connect()`) is called after `form.dispose()`.
- `ForgeSubmitError` — thrown when `submit()` or `submitOrThrow()` is called while a submission is already in progress.
- `ForgeValidationError` — thrown by `submitOrThrow()` when validation fails; carries a `readonly errors: Record<string, string>` map.

Usage notes:

- `form.submit()` returns `{ ok: false, type: 'validation', errors }` — it **never throws** for validation failures.
- `form.submitOrThrow()` throws a `ForgeValidationError` when validation fails — use when you prefer exception-based control flow.
- `form.validate()` (all overloads) returns `{ valid: boolean, errors }` — never throws for validation failures.
- Other thrown exceptions are programming errors: calling mutating APIs after `dispose()` (`ForgeDisposedError`), using a reserved key (`ForgeConfigError`), or calling `submit()` / `submitOrThrow()` while already submitting (`ForgeSubmitError`).
