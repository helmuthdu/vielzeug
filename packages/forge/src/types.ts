export type Unsubscribe = () => void;

export type MaybePromise<T> = T | PromiseLike<T>;

/**
 * `Date`, `File`, and `Blob` are built-in atomic leaves. Dates are cloned and exposed
 * without mutator methods; browser binary values preserve identity. Other values must be
 * finite JSON primitives, plain objects, or dense arrays.
 */
export type Atomic = Date | File | Blob;

type DateMutator = Extract<keyof Date, `set${string}`>;
export type ReadonlyDate = Omit<Date, DateMutator>;

export type ReadonlyDeep<T> = T extends Date
  ? ReadonlyDate
  : T extends File | Blob
    ? T
    : T extends readonly (infer Item)[]
      ? readonly ReadonlyDeep<Item>[]
      : T extends Record<string, unknown>
        ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
        : T;

/** A single flat validation issue. `path: []` denotes a form-level error. */
export type ValidationIssue = Readonly<{ path: readonly (string | number)[]; message: string }>;

export type FormValidator<TValues extends Record<string, unknown>> = (
  values: ReadonlyDeep<TValues>,
  signal: AbortSignal,
) => MaybePromise<readonly ValidationIssue[] | undefined>;

export type FormOptions<TValues extends Record<string, unknown>> = Readonly<{
  initialValues: TValues;
  onSubscriberError?: (error: unknown) => void;
  validate?: FormValidator<NoInfer<TValues>>;
}>;

export type SubscribeOptions = Readonly<{ immediate?: boolean }>;

export type FieldState<V> = Readonly<{
  dirty: boolean;
  error: string | undefined;
  touched: boolean;
  value: ReadonlyDeep<V>;
}>;

export type FormState = Readonly<{
  formError: string | undefined;
  hasErrors: boolean;
  issues: readonly ValidationIssue[] | undefined;
  submitCount: number;
  submitting: boolean;
  touched: boolean;
  validity: 'invalid' | 'unknown' | 'valid';
  validating: boolean;
}>;

export type ValidationResult =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'valid' }>
  | Readonly<{ issues: readonly ValidationIssue[]; status: 'invalid' }>;

export type SubmitResult<TResult = void> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ issues: readonly ValidationIssue[]; status: 'invalid' }>
  | Readonly<{ status: 'ok'; value: TResult }>;

type ChildField<V> =
  NonNullable<V> extends readonly (infer Item)[]
    ? { field(index: number): Field<Item> }
    : NonNullable<V> extends Record<string, unknown>
      ? { field<K extends keyof NonNullable<V> & string>(key: K): Field<NonNullable<V>[K]> }
      : Record<never, never>;

export type Field<V> = ChildField<V> & {
  readonly dirty: boolean;
  readonly error: string | undefined;
  reset(): void;
  set(next: V | ((previous: ReadonlyDeep<V>) => V)): void;
  readonly state: FieldState<V>;
  subscribe(listener: (state: FieldState<V>) => void, options?: SubscribeOptions): Unsubscribe;
  touch(): void;
  readonly touched: boolean;
  readonly value: ReadonlyDeep<V>;
};

export type Form<TValues extends Record<string, unknown>> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  field<K extends keyof TValues & string>(key: K): Field<TValues[K]>;
  reset(next?: TValues): void;
  set(next: TValues | ((previous: ReadonlyDeep<TValues>) => TValues)): void;
  readonly state: FormState;
  submit<TResult = void>(
    handler: (values: ReadonlyDeep<TValues>, signal: AbortSignal) => MaybePromise<TResult>,
    signal?: AbortSignal,
  ): Promise<SubmitResult<TResult>>;
  subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe;
  validate(signal?: AbortSignal): Promise<ValidationResult>;
  readonly value: ReadonlyDeep<TValues>;
};
