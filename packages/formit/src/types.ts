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
  /** Whether to mark the field as touched. Default: false. */
  touched?: boolean;
};

/** Generic form state snapshot. `TValues` types the `dirtyFields` array as typed dot-notation keys. */
export type FormState = {
  errors: Readonly<Record<string, string>>;
  isDirty: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
  /** Field names that currently have an active async validation run. Useful for per-field loading indicators. */
  validatingFields: readonly string[];
};

export type SubscribeOptions = {
  /** Call the listener immediately with the current state on subscription. Default: false. */
  sync?: boolean;
};

/** Shared field used for root-level / form-level validation errors. */
export const FORM_ERROR = '_form' as const;

/** The result returned by `form.validateAll()`, `form.validateTouched()`, and `form.validateFields(...)`. */
export type ValidateResult = {
  errors: Readonly<Record<string, string>>;
  valid: boolean;
};

export type SubmitResult<TResult = void> =
  | { ok: true; value: TResult }
  | { errors: Record<string, string>; ok: false; type: 'validation' };

/* -------------------- Utility Types -------------------- */

/**
 * Recursively extracts all dot-notation leaf keys from a values shape.
 * Depth-limited to 5: TypeScript compilation time grows non-linearly beyond this point,
 * and most real form schemas don't exceed 3–4 levels. Falls back to `string` beyond the limit.
 */
export type FlatKeyOf<
  T extends Record<string, unknown>,
  P extends string = '',
  D extends readonly 0[] = [],
> = D['length'] extends 5
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

/**
 * Recursively makes all properties of T optional, including nested objects.
 * Useful for partial server response merges via `form.patch()`.
 */
export type DeepPartial<T> = T extends Record<string, unknown> ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** Field error keys include field paths plus reserved `_form` for root-level/form-level issues. */
export type ErrorKeyOf<TValues extends Record<string, unknown>> = FlatKeyOf<TValues> | typeof FORM_ERROR;

/** Structural interface for Zod/Valibot/Standard-Schema-compatible schemas. */
export type SafeParseSchema = {
  safeParse(
    data: unknown,
  ): { success: true } | { error: { issues: { message: string; path: (string | number)[] }[] }; success: false };
};

/** The object returned by `form.wire()`. Getters are live — they always read current form state. */
export type WireResult<V = unknown> = {
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
  defaultValues?: TValues;
  /**
   * Default wire behavior applied when `wire(name, config)` omits specific options.
   * Use `ValidationModes` presets for common strategies:
   * - `ValidationModes.onSubmit` (default) — validates only on submit
   * - `ValidationModes.onBlur` — validates each field on blur
   * - `ValidationModes.onChange` — validates each field on every change
   * - `ValidationModes.onTouched` — validates on blur first, then on every change once touched
   */
  validate?: WireConfig;
  /** Form-level validator. Use `schemaValidator(schema)` to adapt a safeParse-compatible schema. */
  validator?: FormValidator<TValues>;
  /** Field-level validators keyed by field name or dot-notation path. */
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator>>;
};

export type WireConfig = {
  /**
   * Debounce auto-triggered validation by this many milliseconds.
   * Useful for async validators on `onChange` to avoid a request per keystroke. Default: 0.
   */
  debounce?: number;
  touchOnBlur?: boolean;
  /** Validate the field automatically when it loses focus. Default: false. */
  validateOnBlur?: boolean;
  /** Validate the field automatically after each value change. Default: false. */
  validateOnChange?: boolean;
  /** Validate on change only after the field has been touched at least once. */
  validateOnTouch?: boolean;
};

/** Named presets for common validation trigger strategies. Pass to `createForm({ validate: ValidationModes.onBlur })`. */
export const ValidationModes = {
  onBlur: { touchOnBlur: true, validateOnBlur: true },
  onChange: { touchOnBlur: true, validateOnChange: true },
  onSubmit: { touchOnBlur: true },
  onTouched: { touchOnBlur: true, validateOnBlur: true, validateOnTouch: true },
} as const satisfies Record<string, WireConfig>;

export interface Form<TValues extends Record<string, unknown> = Record<string, unknown>> {
  array(name: FlatKeyOf<TValues>): ArrayField;
  batch(fn: () => void): void;
  /** Clear a single field error. No-op if the field has no error. */
  clearError(name: ErrorKeyOf<TValues>): void;
  dispose(): void;
  readonly disposed: boolean;
  field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>;
  get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>;
  /**
   * Merge a partial server response into the form: updates both the store and the baseline
   * for each provided field, marking them clean. Fields not included in `partial` are untouched.
   */
  patch(partial: DeepPartial<TValues>): void;
  /** Remove a field entirely: drops value, dirty, touched, error, and any registered validator. */
  removeField(name: FlatKeyOf<TValues>): void;
  /** Replace values and baseline in one operation. Aborts any in-flight validation. */
  replace(newValues: TValues): void;
  /** Restore values from the current baseline and clear errors/touched/dirty. Aborts any in-flight validation. */
  reset(): void;
  resetField(name: FlatKeyOf<TValues>): void;
  /** Replace the entire error map. Use `undefined` values to omit entries. */
  resetErrors(errors?: Partial<Record<ErrorKeyOf<TValues>, string | undefined>>): void;
  set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void;
  /** Set a field error. */
  setError(name: ErrorKeyOf<TValues>, message: string): void;
  /**
   * Add, replace, or remove a field validator.
   * Removing a validator (passing `undefined`) also immediately clears any existing error for that field.
   */
  setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator): void;
  readonly state: FormState;
  submit<TResult = void>(handler: (values: TValues) => MaybePromise<TResult>): Promise<SubmitResult<TResult>>;
  subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe;
  subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe;
  /** Mark a field as touched. */
  touch(name: FlatKeyOf<TValues>): void;
  /** Mark all known fields (store + validators) as touched. */
  touchAll(): void;
  /** Mark a field as untouched. No-op if the field is not currently touched. */
  untouch(name: FlatKeyOf<TValues>): void;
  /** Mark all fields as untouched. */
  untouchAll(): void;
  /** Validate all registered field validators and the optional form validator. */
  validateAll(signal?: AbortSignal): Promise<ValidateResult>;
  /** Validate a single field validator. Does not run the form-level validator. */
  validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>;
  /** Validate provided field validators only. Does not run the form-level validator. */
  validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>;
  /** Validate touched field validators only. Does not run the form-level validator. */
  validateTouched(signal?: AbortSignal): Promise<ValidateResult>;
  values(): TValues;
  /**
   * Returns a live wire object for a field (handlers + live getters).
   * @note Vanilla-JS helper — not reactive in component frameworks. Call once per field and store
   * the result; each call creates a new object with new closure references.
   */
  wire<K extends FlatKeyOf<TValues>>(name: K, config?: WireConfig): WireResult<TypeAtPath<TValues, K>>;
}
