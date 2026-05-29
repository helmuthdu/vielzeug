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

export type FormState = {
  errors: Readonly<Record<string, string>>;
  isDirty: boolean;
  /** `true` while an async `defaultValues` factory is resolving. */
  isLoading: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
  /**
   * Field names that are currently touched, as full dot-notation paths.
   * On a scoped form these are still full paths (e.g. `"address.city"`, not `"city"`).
   * Prefer calling `scopedForm.validate()` rather than passing `state.touchedFields`
   * directly to `scopedForm.validateFields()` — the latter expects relative paths and
   * double-prefixing an already-prefixed key targets a non-existent field.
   *
   * On a root form: `form.validateFields([...state.touchedFields])` works as expected.
   */
  touchedFields: readonly string[];
  /** Field names that currently have an active async validation run. Useful for per-field loading indicators. */
  validatingFields: readonly string[];
};

export type SubscribeOptions = {
  /** Call the listener immediately with the current state on subscription. Default: false. */
  sync?: boolean;
};

/** Shared field key for root-level / form-level validation errors. */
export const FORM_ERROR = '_form' as const;

export type ValidateResult = {
  errors: Readonly<Record<string, string>>;
  valid: boolean;
};

export type SubmitResult<TResult = void> =
  | { ok: true; value: TResult }
  | { errors: Record<string, string>; ok: false; type: 'validation' };

/* -------------------- Utility Types -------------------- */

// Internal — not re-exported from index.ts. TypeScript inlines this in generated declarations.
type DeepPartial<T> = T extends Record<string, unknown> ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Recursively extracts all dot-notation leaf keys from a values shape.
 * Depth-limited to 5: TypeScript compilation time grows non-linearly beyond this point.
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

/** Field error keys include field paths plus the reserved `_form` key for root-level issues. */
export type ErrorKeyOf<TValues extends Record<string, unknown>> = FlatKeyOf<TValues> | typeof FORM_ERROR;

/**
 * Structural interface for safeParse-compatible schemas.
 * Works with `@vielzeug/sieve`, Zod, Valibot, and any Standard Schema compliant library.
 */
export type SafeParseSchema = {
  safeParse(
    data: unknown,
  ): { success: true } | { error: { issues: { message: string; path: (string | number)[] }[] }; success: false };
};

/** The type of values accessible at a scoped sub-form prefix. */
export type ScopedValues<TValues, P extends string> =
  TypeAtPath<TValues, P> extends Record<string, unknown>
    ? TypeAtPath<TValues, P> & Record<string, unknown>
    : Record<string, unknown>;

/**
 * The live connection object returned by `form.connect()`.
 * Getters re-evaluate on every property access — store the object once per field, do not destructure.
 */
export type ConnectionResult<V = unknown> = {
  readonly dirty: boolean;
  readonly error: string | undefined;
  onBlur(): void;
  onChange(value: V): void;
  readonly touched: boolean;
  readonly value: V;
};

/** Per-field or global validation trigger configuration. */
export type ConnectOptions = {
  /**
   * Debounce auto-triggered validation by this many milliseconds.
   * Useful for async validators on `onChange` to avoid a request per keystroke. Default: 0.
   */
  debounce?: number;
  /** Auto-mark the field as touched when it loses focus. Default: **true**. */
  touchOnBlur?: boolean;
  /** Validate the field automatically when it loses focus. Default: false. */
  validateOnBlur?: boolean;
  /** Validate the field automatically after each value change. Default: false. */
  validateOnChange?: boolean;
  /** Validate on change only after the field has been touched at least once. */
  validateOnTouch?: boolean;
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
  /**
   * Default connect behavior applied when `connect(name, config)` omits specific options.
   * Use `ValidationModes` presets for common strategies:
   * - `ValidationModes.onSubmit` (default) — validates only on submit
   * - `ValidationModes.onBlur` — validates each field on blur
   * - `ValidationModes.onChange` — validates each field on every change
   * - `ValidationModes.onTouched` — validates on blur first, then on every change once touched
   */
  connect?: ConnectOptions;
  /**
   * Initial form values. May be a static object or an async factory function.
   * While a factory is pending, `form.state.isLoading` is `true` and the form is read-only.
   */
  defaultValues?: TValues | (() => Promise<TValues>);
  /**
   * Form-level validator. Accepts either:
   * - A `FormValidator` function
   * - Any `safeParse`-compatible schema (auto-detected, works with `@vielzeug/sieve`, Zod, Valibot)
   *
   * Use `schemaValidator(schema)` explicitly when you need custom error mapping.
   */
  validator?: FormValidator<TValues> | SafeParseSchema;
  /** Field-level validators keyed by field name or dot-notation path. */
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator>>;
};

/** Named presets for common validation trigger strategies. Pass to `createForm({ connect: ValidationModes.onBlur })`. */
export const ValidationModes = {
  onBlur: { touchOnBlur: true, validateOnBlur: true },
  onChange: { touchOnBlur: true, validateOnChange: true },
  onSubmit: { touchOnBlur: true },
  onTouched: { touchOnBlur: true, validateOnBlur: true, validateOnTouch: true },
} as const satisfies Record<string, ConnectOptions>;

export interface Form<TValues extends Record<string, unknown> = Record<string, unknown>> {
  /** Returns a cached `ArrayField` helper for mutating array-valued fields. */
  array(name: FlatKeyOf<TValues>): ArrayField;
  batch(fn: () => void): void;
  /** Clear a single field error. No-op if the field has no error. */
  clearError(name: ErrorKeyOf<TValues>): void;
  /**
   * Returns a live connection object for a field (DOM event handlers + live getters).
   * Call once per field and store the result — each call creates a new object.
   * Do not destructure: getters re-evaluate on every property access.
   */
  connect<K extends FlatKeyOf<TValues>>(name: K, config?: ConnectOptions): ConnectionResult<TypeAtPath<TValues, K>>;
  dispose(): void;
  readonly disposed: boolean;
  field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>;
  get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>;
  /** `true` while an async `defaultValues` factory is resolving. Mirrors `state.isLoading`. */
  readonly isLoading: boolean;
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
  /**
   * Returns a scoped sub-form whose field paths are relative to `prefix`.
   * `scopedForm.get('city')` is equivalent to `form.get('${prefix}.city')`.
   * The scoped form shares state and lifecycle with the parent — `dispose()` on a scoped
   * form is a no-op; call `parentForm.dispose()` to tear down the whole form.
   *
   * **Call once and store the result.** Each call creates a new object; calling it inside a
   * reactive render function or computed property will produce stale subscription closures.
   *
   * **`state` is shared**: `scopedForm.state` returns the full form state. `state.errors`,
   * `state.isValid`, `state.touchedFields`, and `state.isDirty` reflect the entire form,
   * not just the scoped fields. Use `scopedForm.validate()` or `scopedForm.submit()` for
   * scoped validity checks — these correctly isolate results to the prefix.
   */
  scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>>;
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
  /**
   * Validate all registered field validators and the optional form validator. Clears all errors first.
   *
   * **On a scoped form** (returned by `scope()`): validates only the fields within the scope
   * and does _not_ run the form-level validator. Errors and `valid` reflect only scoped fields;
   * pre-existing errors on sibling or parent fields are not included.
   */
  validate(signal?: AbortSignal): Promise<ValidateResult>;
  /** Validate a single field. Preserves other fields' errors. Does not run the form-level validator. */
  validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined>;
  /** Validate specific fields. Preserves other fields' errors. Does not run the form-level validator. */
  validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult>;
  values(): TValues;
}
