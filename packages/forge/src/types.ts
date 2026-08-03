export type Unsubscribe = () => void;

export type MaybePromise<T> = T | PromiseLike<T>;

export type ReadonlyDeep<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly ReadonlyDeep<Item>[]
    : T extends Record<string, unknown>
      ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
      : T;

export type FormErrors<T> = T extends readonly unknown[]
  ? string
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]?: FormErrors<T[K]> }
    : string;

export type ValidationErrors<TValues extends Record<string, unknown>> = Readonly<{
  fields?: FormErrors<TValues>;
  formError?: string;
}>;

export type FormValidator<TValues extends Record<string, unknown>> = (
  values: ReadonlyDeep<TValues>,
  signal: AbortSignal,
) => MaybePromise<ValidationErrors<TValues> | undefined>;

export type FormOptions<TValues extends Record<string, unknown>> = Readonly<{
  initialValues: TValues;
  onSubscriberError?: (error: unknown) => void;
  validate?: FormValidator<TValues>;
}>;

export type SubscribeOptions = Readonly<{
  immediate?: boolean;
}>;

export type FieldState<V> = Readonly<{
  dirty: boolean;
  error: string | undefined;
  touched: boolean;
  value: ReadonlyDeep<V>;
}>;

export type FormState<TValues extends Record<string, unknown>> = Readonly<{
  error: string | undefined;
  errors: FormErrors<TValues> | undefined;
  submitCount: number;
  submitting: boolean;
  touched: boolean;
  valid: boolean;
  validating: boolean;
}>;

export type ValidationResult<TValues extends Record<string, unknown>> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'valid' }>
  | Readonly<{ errors: FormErrors<TValues> | undefined; formError: string | undefined; status: 'invalid' }>;

export type SubmitResult<TResult = void, TValues extends Record<string, unknown> = Record<string, unknown>> =
  | Readonly<{ ok: true; value: TResult }>
  | Readonly<{ ok: false; type: 'aborted' }>
  | Readonly<{ errors: FormErrors<TValues> | undefined; formError: string | undefined; ok: false; type: 'validation' }>;

type ChildField<V> =
  NonNullable<V> extends readonly unknown[]
    ? Record<never, never>
    : NonNullable<V> extends Record<string, unknown>
      ? {
          field<K extends keyof NonNullable<V> & string>(key: K): Field<NonNullable<V>[K]>;
        }
      : Record<never, never>;

export type Field<V> = ChildField<V> & {
  readonly dirty: boolean;
  readonly error: string | undefined;
  reset(): void;
  set(next: V | ((previous: ReadonlyDeep<V>) => V)): void;
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
  readonly state: FormState<TValues>;
  submit<TResult = void>(
    handler: (values: ReadonlyDeep<TValues>) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult, TValues>>;
  subscribe(listener: (state: FormState<TValues>) => void, options?: SubscribeOptions): Unsubscribe;
  validate(signal?: AbortSignal): Promise<ValidationResult<TValues>>;
  readonly value: ReadonlyDeep<TValues>;
};
