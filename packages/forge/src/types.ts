export type Unsubscribe = () => void;

export type MaybePromise<T> = T | PromiseLike<T>;

export type ReadonlyDeep<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly ReadonlyDeep<Item>[]
    : T extends Record<string, unknown>
      ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
      : T;

export type FormErrors<T> = T extends readonly (infer Item)[]
  ? string | readonly (FormErrors<Item> | undefined)[]
  : T extends Record<string, unknown>
    ? string | { readonly [K in keyof T]?: FormErrors<T[K]> }
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
  validate?: FormValidator<NoInfer<TValues>>;
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
  errors: FormErrors<TValues> | undefined;
  formError: string | undefined;
  hasErrors: boolean;
  submitCount: number;
  submitting: boolean;
  touched: boolean;
  validity: 'invalid' | 'unknown' | 'valid';
  validating: boolean;
}>;

export type ValidationResult<TValues extends Record<string, unknown>> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'valid' }>
  | Readonly<{ errors: FormErrors<TValues> | undefined; formError: string | undefined; status: 'invalid' }>;

export type SubmitResult<TResult = void, TValues extends Record<string, unknown> = Record<string, unknown>> =
  | Readonly<{ status: 'aborted' }>
  | Readonly<{ status: 'invalid'; errors: FormErrors<TValues> | undefined; formError: string | undefined }>
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
  readonly state: FormState<TValues>;
  submit<TResult = void>(
    handler: (values: ReadonlyDeep<TValues>, signal: AbortSignal) => MaybePromise<TResult>,
    signal?: AbortSignal,
  ): Promise<SubmitResult<TResult, TValues>>;
  subscribe(listener: (state: FormState<TValues>) => void, options?: SubscribeOptions): Unsubscribe;
  validate(signal?: AbortSignal): Promise<ValidationResult<TValues>>;
  readonly value: ReadonlyDeep<TValues>;
};
