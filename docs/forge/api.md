---
title: Forge — API Reference
description: Complete reference for immutable forms, fields, validation, serialization, and optional adapters.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createForm()` | Create immutable form state | Sync | `initialValues` cannot contain mutable class instances |
| `form.field()` | Select a top-level or object child field | Sync | Unsafe keys (`__proto__`, `constructor`, `prototype`) are rejected |
| `form.validate()` | Validate complete value | Async | Handle `aborted` separately |
| `form.submit(handler, signal?)` | Touch, validate, then invoke handler | Async | Concurrent calls reject |
| `form.reset()` | Restore or replace baseline | Sync | `reset(next)` makes `next` clean |
| `form.subscribe()` | Observe form metadata | Sync | Throws after disposal |
| `toFormData()` | Serialize values for multipart transport | Sync | `FileList` is transport-only |
| `bindField()` | Bind one DOM element | Sync | Does not schedule validation |
| `customValidator()` | Adapt a Spell schema | Async | Does not transform `form.value` |
| `saveForm()` / `loadForm()` | Persist explicit Vault records | Async | FormDraftCodec owns record shape |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/forge` | Core form factory, types, and errors |
| `@vielzeug/forge/dom` | `bindField()` and DOM binding types |
| `@vielzeug/forge/form-data` | `toFormData()` |
| `@vielzeug/forge/spell` | `customValidator()` |
| `@vielzeug/forge/vault` | `saveForm()`, `loadForm()`, and `FormDraftCodec` |

## Core Functions

### `createForm(options)`

```ts
function createForm<TValues extends Record<string, unknown>>(options: FormOptions<TValues>): Form<TValues>;
```

Creates a form with immutable initial values and an optional full-form validator.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.initialValues` | `TValues` | Initial value and reset baseline. Supports primitives, plain objects, arrays, `Date`, `File`, and `Blob`. |
| `options.validate` | `FormValidator<TValues>` | Optional validator for the entire current value. |
| `options.onSubscriberError` | `(error: unknown) => void` | Optional subscriber failure reporter. |

**Returns:** `Form<TValues>`.

**Example:**

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({ initialValues: { email: '' } });
```

---

### `toFormData(values)`

```ts
function toFormData(values: Record<string, unknown>): FormData;
```

Converts nested values into `FormData` with dot-separated object keys and repeated array keys.

**Returns:** a populated `FormData` instance.

**Example:**

```ts
import { toFormData } from '@vielzeug/forge/form-data';

const body = toFormData({ profile: { email: 'ada@example.com' }, tags: ['typescript', 'forms'] });
```

## Form Handles

### `Form<TValues>`

`createForm()` returns this handle.

| Member | Signature | Description |
| --- | --- | --- |
| `value` | `ReadonlyDeep<TValues>` | Current immutable value. |
| `state` | `FormState<TValues>` | Submission, validation, touch, and error metadata. |
| `field(key)` | `Field<TValues[K]>` | Select a top-level field. |
| `set(next)` | `void` | Replace the complete value or derive a replacement. |
| `reset(next?)` | `void` | Restore baseline or make `next` the baseline. |
| `validate(signal?)` | `Promise<ValidationResult<TValues>>` | Run full-form validation. |
| `submit(handler, signal?)` | `Promise<SubmitResult<TResult, TValues>>` | Touch, validate, and invoke handler when valid. |
| `subscribe(listener, options?)` | `Unsubscribe` | Observe form state; throws after disposal. |
| `dispose()` | `void` | Abort validation and clear subscribers. |
| `disposed` | `boolean` | Whether the form has been disposed. |
| `disposalSignal` | `AbortSignal` | Aborts on disposal. |

### `Field<V>`

`form.field(key)` and object-field `.field(key)` return this handle. Array-item `.field(index)` returns a per-item field handle.

| Member | Signature | Description |
| --- | --- | --- |
| `value` | `ReadonlyDeep<V>` | Current immutable branch value. |
| `error` | `string \| undefined` | Current field error. |
| `dirty` | `boolean` | Whether branch differs from baseline. |
| `touched` | `boolean` | Whether field was touched. |
| `state` | `FieldState<V>` | Snapshot of `dirty`, `error`, `touched`, and `value` in one read. |
| `field(key)` | `Field<V[K]>` | Select child object field or array item by index. |
| `set(next)` | `void` | Replace branch or derive a replacement. |
| `reset()` | `void` | Restore exact baseline branch. |
| `touch()` | `void` | Mark field touched. |
| `subscribe(listener, options?)` | `Unsubscribe` | Observe field transitions; throws after disposal. |

## Validation Results

### `form.validate(signal?)`

```ts
function validate(signal?: AbortSignal): Promise<ValidationResult<TValues>>;
```

Runs the configured validator against the complete value. A newer validation aborts the older run.

**Returns:** `ValidationResult<TValues>`.

```ts
const result = await form.validate();

if (result.status === 'invalid') console.log(result.errors, result.formError);
```

### `form.submit(handler, signal?)`

```ts
function submit<TResult = void>(
  handler: (values: ReadonlyDeep<TValues>, signal: AbortSignal) => MaybePromise<TResult>,
  signal?: AbortSignal,
): Promise<SubmitResult<TResult, TValues>>;
```

Touches all fields, validates once, and invokes `handler` when validation is valid. The handler receives an `AbortSignal` that is aborted when the external `signal` (or the form's disposal signal) aborts.

**Returns:** `SubmitResult<TResult, TValues>`. Handler failures reject normally unless caused by signal abort, which returns `{ status: 'aborted' }`.

```ts
const result = await form.submit((value) => Promise.resolve(value));
```

## Adapters

### `bindField(element, field, options)`

```ts
function bindField<Element extends HTMLElement, V>(
  element: Element,
  field: Field<V>,
  options: FieldBindingOptions<Element, V>,
): () => void;
```

Binds one field to one element, marks it touched on blur, suppresses writeback from its own input event, and returns teardown.

**Example:**

```ts
import { bindField } from '@vielzeug/forge/dom';

const stop = bindField(input, form.field('email'), {
  read: (element) => element.value,
  write: (element, value) => {
    element.value = value;
  },
});
```

---

### `customValidator(schema)`

```ts
function customValidator<TValues extends Record<string, unknown>>(
  schema: Schema<unknown, TValues, SchemaMode>,
): FormValidator<TValues>;
```

Adapts a Spell schema. Every failing union maps its closest branch while preserving unrelated errors. Array item issues map to per-item array fields; duplicate paths retain the first message.

**Example:**

```ts
import { customValidator } from '@vielzeug/forge/spell';
import { s } from '@vielzeug/spell';

const Profile = s.object({ email: s.string().email() });
const form = createForm({ initialValues: { email: '' }, validate: customValidator(Profile) });
```

---

### `saveForm()` and `loadForm()`

```ts
function saveForm<TValues extends Record<string, unknown>, S extends AnySchema, K extends keyof S & string>(
  form: Form<TValues>, adapter: VaultStore<S>, table: K, codec: FormDraftCodec<TValues, S, K>,
): Promise<void>;

function loadForm<TValues extends Record<string, unknown>, S extends AnySchema, K extends keyof S & string>(
  form: Form<TValues>, adapter: VaultStore<S>, table: K, key: KeyOf<S, K>, codec: FormDraftCodec<TValues, S, K>,
): Promise<boolean>;
```

Persists or restores a codec-defined Vault record. `loadForm()` calls `form.reset()` when the codec decodes a record.

**Returns:** `loadForm()` returns `false` for a missing or rejected record.

## Types

```ts
type Unsubscribe = () => void;
type MaybePromise<T> = T | PromiseLike<T>;
type ReadonlyDeep<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly ReadonlyDeep<Item>[]
    : T extends Record<string, unknown>
      ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
      : T;

type FormErrors<T> = T extends readonly (infer Item)[]
  ? string | readonly (FormErrors<Item> | undefined)[]
  : T extends Record<string, unknown>
    ? string | { readonly [K in keyof T]?: FormErrors<T[K]> }
    : string;

type ValidationErrors<TValues extends Record<string, unknown>> = Readonly<{
  fields?: FormErrors<TValues>;
  formError?: string;
}>;

type FormValidator<TValues extends Record<string, unknown>> = (
  values: ReadonlyDeep<TValues>, signal: AbortSignal,
) => MaybePromise<ValidationErrors<TValues> | undefined>;

type FormOptions<TValues extends Record<string, unknown>> = Readonly<{
  initialValues: TValues;
  onSubscriberError?: (error: unknown) => void;
  validate?: FormValidator<NoInfer<TValues>>;
}>;

type SubscribeOptions = Readonly<{ immediate?: boolean }>;

type FieldState<V> = Readonly<{
  dirty: boolean;
  error: string | undefined;
  touched: boolean;
  value: ReadonlyDeep<V>;
}>;

type FormState<TValues extends Record<string, unknown>> = Readonly<{
  errors: FormErrors<TValues> | undefined;
  formError: string | undefined;
  hasErrors: boolean;
  submitCount: number;
  submitting: boolean;
  touched: boolean;
  validity: 'invalid' | 'unknown' | 'valid';
  validating: boolean;
}>;

type ValidationResult<TValues extends Record<string, unknown>> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'valid' }>
  | Readonly<{ errors: FormErrors<TValues> | undefined; formError: string | undefined; status: 'invalid' }>;

type SubmitResult<TResult = void, TValues extends Record<string, unknown> = Record<string, unknown>> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ errors: FormErrors<TValues> | undefined; formError: string | undefined; status: 'invalid' }>
  | Readonly<{ status: 'ok'; value: TResult }>;
```

```ts
type ChildField<V> =
  NonNullable<V> extends readonly (infer Item)[]
    ? { field(index: number): Field<Item> }
    : NonNullable<V> extends Record<string, unknown>
      ? { field<K extends keyof NonNullable<V> & string>(key: K): Field<NonNullable<V>[K]> }
      : Record<never, never>;

type Field<V> = ChildField<V> & {
  readonly dirty: boolean;
  readonly error: string | undefined;
  readonly state: FieldState<V>;
  readonly touched: boolean;
  readonly value: ReadonlyDeep<V>;
  reset(): void;
  set(next: V | ((previous: ReadonlyDeep<V>) => V)): void;
  subscribe(listener: (state: FieldState<V>) => void, options?: SubscribeOptions): Unsubscribe;
  touch(): void;
};

type Form<TValues extends Record<string, unknown>> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly state: FormState<TValues>;
  readonly value: ReadonlyDeep<TValues>;
  dispose(): void;
  field<K extends keyof TValues & string>(key: K): Field<TValues[K]>;
  reset(next?: TValues): void;
  set(next: TValues | ((previous: ReadonlyDeep<TValues>) => TValues)): void;
  submit<TResult = void>(
    handler: (values: ReadonlyDeep<TValues>, signal: AbortSignal) => MaybePromise<TResult>,
    signal?: AbortSignal,
  ): Promise<SubmitResult<TResult, TValues>>;
  subscribe(listener: (state: FormState<TValues>) => void, options?: SubscribeOptions): Unsubscribe;
  validate(signal?: AbortSignal): Promise<ValidationResult<TValues>>;
};

type FieldBindingOptions<Element extends HTMLElement, V> = Readonly<{
  event?: keyof HTMLElementEventMap;
  read(element: Element): V;
  write?: (element: Element, value: ReadonlyDeep<V>) => void;
}>;

type FormDraftCodec<TValues extends Record<string, unknown>, S extends AnySchema, K extends keyof S & string> = Readonly<{
  fromRecord(record: RecordOf<S, K>): TValues | undefined;
  toRecord(values: ReadonlyDeep<TValues>): RecordOf<S, K>;
}>;
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `ForgeError` | Base Forge error | `ForgeError.is(error)` narrows unknown values. |
| `ForgeConfigError` | Unsafe key or unsupported form value | Extends `ForgeError`. |
| `ForgeDisposedError` | Operation or subscription after disposal | Message names the attempted operation. |
| `ForgeSubmitError` | Concurrent `submit()` call | Extends `ForgeError`. |
| `ForgeValidationError` | Validator throws unexpectedly | Preserves original error as `cause`. |
