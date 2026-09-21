---
title: Forge — API Reference
description: Immutable typed form state, flat validation issues, and optional integration helpers.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createForm()` | Create immutable form and field state | Sync | Dispose with its owner |
| `toPlainValues()` | Flatten class instances to the plain value shape | Sync | Drops circular branches |
| `validate()` | Run the configured full-form validator | Async | Superseded work returns `aborted` |
| `submit()` | Validate and submit one captured snapshot | Async | Concurrent submission rejects |
| `bindField()` | Bind a field to an HTML element | Sync | Caller owns returned cleanup |
| `schemaValidator()` | Adapt Standard Schema validation | Async | Transform output is not applied |
| `loadForm()` / `saveForm()` | Explicit structural draft persistence | Async | Loading will not overwrite newer edits |
| `toFormData()` | Serialize supported values | Sync | Dotted keys and object arrays reject |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/forge` | Form and field state |
| `@vielzeug/forge/dom` | `bindField()` DOM binding |
| `@vielzeug/forge/form-data` | `toFormData()` serialization |
| `@vielzeug/forge/schema` | Standard Schema validation adapter |
| `@vielzeug/forge/persist` | Explicit draft save/load helpers |

## createForm

```ts
function createForm<TValues extends Record<string, unknown>>(
  options: FormOptions<TValues>,
): Form<TValues>
```

`initialValues` is required. Validation is explicit and returns flat issues.

```ts
const form = createForm({
  initialValues: { email: '' },
  validate: (values) =>
    values.email.includes('@') ? undefined : [{ path: ['email'], message: 'Invalid email' }],
});
```

`normalize` runs before value validation at every write boundary (`initialValues`, `set`, `patch`, `reset`, `field().set`), so a caller that normalizes once at `createForm` stays correct everywhere. Pair it with `toPlainValues()` to hold domain-model classes in form state.

```ts
import { createForm, toPlainValues } from '@vielzeug/forge';

const form = createForm({ initialValues: { user: new UserModel() }, normalize: toPlainValues });

form.reset({ user: new UserModel() }); // same normalization as init
```

## toPlainValues

```ts
function toPlainValues<T>(value: T): T;
```

Deeply converts a value into the plain shape Forge accepts: primitives pass through, `Date` is cloned, `File`/`Blob` keep identity, arrays map, and class instances flatten to their own enumerable entries. Unsafe keys (`__proto__`, `constructor`, `prototype`) are dropped, so the output always passes value validation. The returned type parameter is a convenience cast — the flattened shape differs from the input type whenever class instances are present.

Lossy conversions replace the error an un-normalized write would throw: `Map`, `Set`, and other keyless built-ins flatten to `{}`; sparse array slots are dropped, shifting later indexes; `NaN`, `Infinity`, functions, and circular branches become `undefined`. Normalize model classes, not arbitrary graphs.

```ts
import { createForm, toPlainValues } from '@vielzeug/forge';

class UserModel {
  email = '';
  name = '';
}

toPlainValues(new UserModel()); // { email: '', name: '' }
const form = createForm({ initialValues: { user: new UserModel() }, normalize: toPlainValues });
```

## Form

```ts
interface Form<TValues extends Record<string, unknown>> {
  readonly value: ReadonlyDeep<TValues>;
  readonly state: FormState;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  field<K extends keyof TValues & string>(key: K): Field<TValues[K]>;
  set(next: TValues | ((previous: ReadonlyDeep<TValues>) => TValues)): void;
  patch(next: Partial<TValues>): void;
  patch(updater: (previous: ReadonlyDeep<TValues>) => Partial<TValues>): void;
  reset(next?: TValues): void;
  validate(signal?: AbortSignal): Promise<ValidationResult>;
  submit<TResult>(handler, signal?: AbortSignal): Promise<SubmitResult<TResult>>;
  subscribe(listener, options?: { immediate?: boolean }): () => void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

`validate()` and `submit()` return `{ status: 'valid' }`, `{ status: 'invalid', issues }`, or `{ status: 'aborted' }`. Successful submission returns `{ status: 'ok', value }`. Submission handlers receive the exact snapshot that passed validation. `form.state` retains one stable reference until the next transition for framework external-store adapters.

`patch()` shallow-merges top-level keys — `form.patch({ count: 1 })` equals `form.set((prev) => ({ ...prev, count: 1 }))` without the `as T` cast a spread requires. Nested values replace by identity; there is no deep merge.

```ts
type FormState = Readonly<{
  formError: string | undefined;
  hasErrors: boolean;
  issues: readonly ValidationIssue[] | undefined;
  submitCount: number;
  submitting: boolean;
  touched: boolean;
  validity: 'invalid' | 'unknown' | 'valid';
  validating: boolean;
}>;
```

## Field

```ts
interface Field<Value> {
  readonly value: ReadonlyDeep<Value>;
  readonly state: FieldState<Value>;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly error: string | undefined;
  field(keyOrIndex): Field<unknown>;
  set(next: Value | ((previous: Value) => Value)): void;
  reset(): void;
  touch(): void;
  subscribe(listener, options?: { immediate?: boolean }): () => void;
}
```

Nested `field().field()` handles avoid string paths while preserving type inference.

## Value types

```ts
type Atomic = Date | File | Blob;
type ReadonlyDate = Omit<Date, Extract<keyof Date, `set${string}`>>;
type ReadonlyDeep<T> = T extends Date
  ? ReadonlyDate
  : T extends File | Blob
    ? T
    : T extends readonly (infer Item)[]
      ? readonly ReadonlyDeep<Item>[]
      : T extends Record<string, unknown>
        ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
        : T;
```

Forge clones valid dates, preserves binary identity, freezes plain containers, and rejects unsupported, circular, sparse, or non-finite values.

## ValidationIssue

```ts
type ValidationIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;
```

`path: []` denotes a form-level issue. A field derives its first matching error from the flat issue list.

## bindField

```ts
import { bindField } from '@vielzeug/forge/dom';

const stop = bindField(input, form.field('email'), {
  read: (element) => element.value,
  write: (element, value) => { element.value = value; },
});
```

The binding reads the configured event (`input` by default), marks the field touched on blur, writes external state changes, and returns cleanup.

## schemaValidator

```ts
import { schemaValidator } from '@vielzeug/forge/schema';

const form = createForm({
  initialValues: { email: '' },
  validate: schemaValidator(UserSchema),
});
```

Accepts any Standard Schema-compatible validator. Portable issues are copied into Forge-owned immutable `{ path, message }` values. Cancellation settles promptly, although the underlying schema operation may continue. Successful transformed output is intentionally not written into the form.

## Draft persistence

```ts
import { loadForm, saveForm } from '@vielzeug/forge/persist';

await saveForm(form, store, 'drafts', codec);
await loadForm(form, store, 'drafts', 'profile', codec, { signal });
```

The store is structural: it only needs typed `get(table, key)` and `put(table, value)` methods. The codec owns record conversion. The optional signal and form disposal cancel pending work; a load returns `false` when values changed before the record arrived.

## FormData

```ts
import { toFormData } from '@vielzeug/forge/form-data';

const body = toFormData(form.value);
```

Flattens nested plain objects to dotted keys and repeats scalar or binary array entries. Dots in object keys and nested objects or arrays inside arrays throw `ForgeConfigError` to prevent ambiguous or lossy output.

## Errors

- `ForgeError` — base package error.
- `ForgeConfigError` — invalid value, path, issue, or serialization configuration.
- `ForgeDisposedError` — operation attempted after disposal.
- `ForgeSubmitError` — concurrent submission attempt.
- `ForgeValidationError` — unexpected validator execution failure, with the original `cause`.
