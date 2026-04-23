/** A callback to remove a subscription. */
export type Unsubscribe = () => void;

export type MaybePromise<T> = T | PromiseLike<T>;

export type FieldValidator<V = unknown> = (value: V, signal: AbortSignal) => MaybePromise<string | undefined>;

export type FormValidator<TValues extends Record<string, unknown> = Record<string, unknown>> = (
  values: TValues,
  signal: AbortSignal,
) => MaybePromise<Record<string, string> | undefined>;

export type SetOptions = {
  dirty?: boolean; // default: true
  touched?: boolean; // default: false
};

/** Generic form state snapshot. `TValues` types the `dirtyFields` array as typed dot-notation keys. */
export type FormState<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  /** Flat dot-notation keys of all fields that differ from their default value. */
  dirtyFields: FlatKeyOf<TValues>[];
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  submitCount: number;
};

export type SubscribeOptions = {
  immediate?: boolean;
};

/** The result returned by `form.validateAll()`, `form.validateTouched()`, or `form.validateFields()`. */
export type ValidateResult = {
  /** Full current error map (all fields, not only the ones validated in this run). */
  errors: Record<string, string>;
  /** Whether the entire error map is empty after this validation run. */
  valid: boolean;
};

/* -------------------- Utility Types -------------------- */

/** Recursively extracts all dot-notation leaf keys from a values shape (depth-limited to 8). */
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

/** Recursively makes all properties optional; arrays and special objects are kept as-is. */
export type DeepPartial<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K] extends unknown[] | File | Blob | Date
    ? T[K]
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

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

export type ArrayFieldBatch = {
  append(value: unknown): void;
  move(from: number, to: number): void;
  remove(index: number): void;
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
  validator?: FormValidator<TValues>;
  /** Field-level validators keyed by field name or dot-notation path. */
  validators?: Partial<Record<FlatKeyOf<TValues>, FieldValidator | FieldValidator[]>>;
};

export type BindConfig = {
  touchOnBlur?: boolean;
  /** Validate the field automatically when it loses focus. Default: false. */
  validateOnBlur?: boolean;
  /** Validate the field automatically after each value change. Default: false. */
  validateOnChange?: boolean;
};

export interface Form<TValues extends Record<string, unknown> = Record<string, unknown>> {
  array(name: FlatKeyOf<TValues>): ArrayFieldBatch;
  bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>;
  clearError(name: FlatKeyOf<TValues>): void;
  dispose(): void;
  readonly disposed: boolean;
  readonly errors: Record<string, string>;
  field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>;
  get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>;
  readonly isDirty: boolean;
  readonly isSubmitting: boolean;
  readonly isTouched: boolean;
  readonly isValid: boolean;
  readonly isValidating: boolean;
  /** Restore values from the current baseline and clear errors/touched/dirty. */
  reset(): void;
  /** Replace values and baseline in one operation. */
  replace(newValues: DeepPartial<TValues>): void;
  resetField(name: FlatKeyOf<TValues>): void;
  set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void;
  setError(name: FlatKeyOf<TValues>, message: string): void;
  /** Merge specific fields into the current error map; pass `undefined` to clear a field. */
  mergeErrors(errors: Partial<Record<FlatKeyOf<TValues>, string | undefined>>): void;
  setErrors(errors: Partial<Record<FlatKeyOf<TValues>, string>>): void;
  readonly state: FormState<TValues>;
  submit<TResult = void>(handler: (values: TValues) => MaybePromise<TResult>, signal?: AbortSignal): Promise<TResult>;
  readonly submitCount: number;
  subscribeForm(listener: (state: FormState<TValues>) => void, options?: SubscribeOptions): Unsubscribe;
  subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe;
  touch(name: FlatKeyOf<TValues>): void;
  touchAll(): void;
  /** Remove touched state from a single field without resetting its value. */
  untouch(name: FlatKeyOf<TValues>): void;
  /** Remove touched state from all fields without resetting values. */
  untouchAll(): void;
  /** Full validation: field validators + form validator. Replaces full error map. */
  validateAll(signal?: AbortSignal): Promise<ValidateResult>;
  /** Partial validation: touched field validators only. Preserves unvisited errors. */
  validateTouched(signal?: AbortSignal): Promise<ValidateResult>;
  /** Partial validation: specific field validators only. Preserves unvisited errors. */
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
