/** A callback to remove a subscription. */
export type Unsubscribe = () => void;

export type MaybePromise<T> = T | PromiseLike<T>;

export type FieldValidator<V = unknown> = (value: V, signal?: AbortSignal) => MaybePromise<string | undefined>;

export type FormValidator<TValues extends Record<string, unknown> = Record<string, unknown>> = (
  values: TValues,
  signal?: AbortSignal,
) => MaybePromise<Partial<Record<ErrorKeyOf<TValues>, string>> | undefined>;

export type SetOptions = {
  /** Whether to update dirty tracking. Default: true. */
  dirty?: boolean;
  touched?: boolean; // default: false
};

/** Generic form state snapshot. `TValues` types the `dirtyFields` array as typed dot-notation keys. */
export type FormState = {
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
};

export type SubscribeOptions = {
  /** Call the listener immediately with the current state on subscription. Default: false. */
  sync?: boolean;
};

/** The result returned by `form.validateAll()`, `form.validateTouched()`, and `form.validateFields(...)`. */
export type ValidateResult = {
  /** Errors scoped to only the fields validated in this run. */
  errors: Record<string, string>;
  /** Whether the entire form error map is empty after this run. */
  valid: boolean;
};

/* -------------------- Utility Types -------------------- */

/**
 * Recursively extracts all dot-notation leaf keys from a values shape.
 * Depth-limited to 8: beyond that, falls back to `string` to keep TypeScript compilation fast
 * and prevent infinite recursion on wide or circular shapes.
 */
export type FlatKeyOf<
  T extends Record<string, unknown>,
  P extends string = '',
  D extends readonly 0[] = [],
> = D['length'] extends 8
  ? string
  : {
      [K in keyof T & string]: T[K] extends unknown[] | File | Blob | Date
        ? P extends ''
          ? K
          : `${P}.${K}`
        : T[K] extends Record<string, unknown>
          ? FlatKeyOf<T[K] & Record<string, unknown>, P extends '' ? K : `${P}.${K}`, [...D, 0]>
          : P extends ''
            ? K
            : `${P}.${K}`;
    }[keyof T & string];

/** Resolves the value type at a dot-notation path within a values shape. */
export type TypeAtPath<T, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends Record<string, unknown>
      ? TypeAtPath<T[Head], Tail>
      : unknown
    : unknown
  : K extends keyof T
    ? T[K]
    : unknown;

/** Field error keys include field paths plus reserved `_form` for root-level/form-level issues. */
export type ErrorKeyOf<TValues extends Record<string, unknown>> = FlatKeyOf<TValues> | '_form';

/** Structural interface for Zod/Valibot/Standard-Schema-compatible schemas. */
export type SafeParseSchema = {
  safeParse(
    data: unknown,
  ): { success: true } | { error: { issues: { message: string; path: (string | number)[] }[] }; success: false };
};

/** The object returned by `form.bind()`. Getters are live — they always read current form state. */
export type BindResult<V = unknown> = {
  readonly dirty: boolean;
  readonly error: string | undefined;
  onBlur(): void;
  onChange(value: V): void;
  readonly touched: boolean;
  readonly value: V;
};

export type ArrayField = {
  append(value: unknown): void;
  insert(index: number, value: unknown): void;
  move(from: number, to: number): void;
  prepend(value: unknown): void;
  remove(index: number): void;
  replace(index: number, value: unknown): void;
  swap(a: number, b: number): void;
};

export type FieldState<V = unknown> = {
  dirty: boolean;
  error: string | undefined;
  touched: boolean;
  value: V;
};

export type FormOptions<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  /** Default bind behavior applied when `bind(name, config)` omits specific options. */
  bindDefaults?: BindConfig;
  defaultValues?: TValues;
  /**
   * Global validation trigger mode. Sets `bindDefaults` unless explicit `bindDefaults` are also provided.
   * - `'onSubmit'` (default) — validates only on submit
   * - `'onBlur'` — validates each field on blur
   * - `'onChange'` — validates each field on every change
   * - `'onTouched'` — validates on blur first, then on every change once touched
   */
  mode?: ValidationMode;
  /** Form-level validator. Use `schemaValidator(schema)` to adapt a safeParse-compatible schema. */
  validator?: FormValidator<TValues>;
  /** Field-level validators keyed by field name or dot-notation path. */
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator>>;
};

export type ValidationMode = 'onChange' | 'onBlur' | 'onTouched' | 'onSubmit';

export type BindConfig = {
  touchOnBlur?: boolean;
  /** Validate the field automatically when it loses focus. Default: false. */
  validateOnBlur?: boolean;
  /** Validate the field automatically after each value change. Default: false. */
  validateOnChange?: boolean;
  /** Validate on change only after the field has been touched at least once. */
  validateOnChangeAfterTouch?: boolean;
};

export interface Form<TValues extends Record<string, unknown> = Record<string, unknown>> {
  array(name: FlatKeyOf<TValues>): ArrayField;
  /**
   * Returns a live binding object for a field.
   * @note Vanilla-JS helper — not reactive in component frameworks. Use a framework adapter for reactivity.
   */
  bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>;
  dispose(): void;
  readonly disposed: boolean;
  field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>;
  get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>;
  /** Restore values from the current baseline and clear errors/touched/dirty. */
  reset(): void;
  /** Replace values and baseline in one operation. */
  replace(newValues: TValues): void;
  resetField(name: FlatKeyOf<TValues>): void;
  /** Remove a field entirely: drops value, dirty, touched, error, and any registered validator. */
  removeField(name: FlatKeyOf<TValues>): void;
  set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void;
  /** Set one field error. Pass `undefined` to clear that field. */
  setError(name: ErrorKeyOf<TValues>, message?: string): void;
  /** Replace the entire error map. Use `undefined` values to omit entries. */
  setErrors(errors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>>): void;
  /** Mark a field as touched. */
  touch(name: FlatKeyOf<TValues>): void;
  /** Mark a field as untouched. */
  untouch(name: FlatKeyOf<TValues>): void;
  /** Mark all known fields (store + validators) as touched. */
  touchAll(): void;
  /** Mark all fields as untouched. */
  untouchAll(): void;
  readonly state: FormState;
  submit<TResult = void>(
    handler: (values: TValues) => MaybePromise<TResult>,
    onInvalid?: (errors: Record<string, string>) => MaybePromise<void>,
  ): Promise<TResult | void>;
  subscribeForm(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe;
  subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe;
  /** Validate all registered field validators and the optional form validator. */
  validateAll(signal?: AbortSignal): Promise<ValidateResult>;
  /** Validate only touched fields. */
  validateTouched(signal?: AbortSignal): Promise<ValidateResult>;
  /** Validate only the provided fields. */
  validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>;
  validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>;
  values(): TValues;
}

export class SubmitError extends Error {
  readonly type = 'submit' as const;
  constructor() {
    super('Form is already being submitted');
    this.name = 'SubmitError';
  }
}

export class FormValidationError extends Error {
  readonly errors: Record<string, string>;
  readonly type = 'validation' as const;
  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.name = 'FormValidationError';
    this.errors = errors;
  }
}
