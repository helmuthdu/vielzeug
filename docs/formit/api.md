---
title: Formit - API Reference
description: Complete API reference for the Formit form management library.
---

[[toc]]

## createForm

```ts
function createForm<TValues extends Record<string, unknown>>(init?: FormOptions<TValues>): Form<TValues>;
```

### FormOptions

```ts
interface FormOptions<TValues extends Record<string, unknown>> {
  bindDefaults?: BindConfig;
  defaultValues?: TValues;
  validator?: FormValidator<TValues>;
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator | FieldValidator[]>>;
}
```

`validators` and value methods are path-typed from `TValues`. For dynamic forms, use a broader values type (for example `Record<string, unknown>`).

## Values

### get(name)

```ts
get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>
```

### set(name, value, options?)

```ts
set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void
```

```ts
interface SetOptions {
  dirty?: boolean;   // default: true
  touched?: boolean; // default: false
}
```

### values()

```ts
values(): TValues
```

## Field State

### field(name)

```ts
field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>
```

```ts
interface FieldState<V = unknown> {
  value: V;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
}
```

## Error Store

```ts
setError(name: FlatKeyOf<TValues>, message: string): void
clearError(name: FlatKeyOf<TValues>): void
setErrors(next: Partial<Record<FlatKeyOf<TValues>, string>>): void
mergeErrors(next: Partial<Record<FlatKeyOf<TValues>, string | undefined>>): void
readonly errors: Record<string, string>
```

## Touch

```ts
touch(name: FlatKeyOf<TValues>): void
touchAll(): void
untouch(name: FlatKeyOf<TValues>): void
untouchAll(): void
```

## Validation

```ts
validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>
validateAll(signal?: AbortSignal): Promise<ValidateResult>
validateTouched(signal?: AbortSignal): Promise<ValidateResult>
validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>
```

```ts
interface ValidateResult {
  valid: boolean;
  errors: Record<string, string>;
}
```

## Submit

```ts
submit<R>(handler: (values: TValues) => R | Promise<R>, signal?: AbortSignal): Promise<R>
```

Submit behavior is fixed:

- always touchAll
- always validateAll
- throws FormValidationError when invalid

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
type SubscribeOptions = { immediate?: boolean };
type Unsubscribe = () => void;
```

## Bind

```ts
bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>
```

```ts
interface BindConfig {
  touchOnBlur?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}
```

```ts
interface BindResult<V = unknown> {
  readonly value: V;
  readonly error: string | undefined;
  readonly touched: boolean;
  readonly dirty: boolean;
  onBlur(): void;
  onChange(value: V): void;
}
```

## Arrays

```ts
array(name: FlatKeyOf<TValues>): {
  append(value: unknown): void;
  remove(index: number): void;
  move(from: number, to: number): void;
}
```

## Reset and Replace

```ts
reset(): void
replace(newValues: DeepPartial<TValues>): void
resetField(name: FlatKeyOf<TValues>): void
```

- reset(): restore values from current baseline.
- replace(...): replace current values and baseline in one operation.

## Lifecycle

```ts
dispose(): void
readonly disposed: boolean
```

## Standalone Utilities

```ts
fromSchema(schema): Pick<FormOptions<TValues>, 'validator'>
toFormData(values: Record<string, unknown>): FormData
```

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
- `DeepPartial<T>`
