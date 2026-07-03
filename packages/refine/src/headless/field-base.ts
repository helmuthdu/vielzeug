import { createStableId } from '@vielzeug/ore';
import { computed, type Readable } from '@vielzeug/ripple';

// ── Validation / context types ────────────────────────────────────────────────

export type ValidationTrigger = 'blur' | 'change' | 'input' | 'submit';
export type ControlValidationMode = ValidationTrigger | undefined;

// ── Field options + handle ───────────────────────────────────────────────────

/** Options shared by both `createTextField` and `createChoiceField`. */
export type FieldOptions = {
  disabled?: Readable<boolean | undefined>;
  error?: Readable<string | undefined>;
  /**
   * Returns the underlying form field object used for validation triggering.
   * Called lazily — safe to return `null` before the first render.
   */
  getFormField?: () => { reportValidity(): void } | null;
  /**
   * Override for label visibility that takes precedence over deriving it from
   * the `label` text signal. Pass a computed signal that checks both prop and
   * slot presence to enable slot-first composition.
   *
   * @example
   * ```ts
   * const hasLabel = computed(() => !!props.label.value || slots.has('label').value);
   * const field = createField({ ...options, hasLabel });
   * ```
   */
  hasLabel?: Readable<boolean>;
  helper?: Readable<string | undefined>;
  /**
   * When provided, used directly as `fieldId` instead of generating one via
   * `createStableId`. Useful in tests for deterministic ID assertions.
   */
  id?: string;
  /**
   * Label text signal. When provided, `labelVisible` and `ariaLabelledBy` are
   * computed reactively from this value (see `hasLabel` for the slot-first override).
   */
  label?: Readable<string | undefined>;
  /**
   * Label placement signal. Defaults to `'inset'`.
   *
   * Not currently consumed by `createField()` itself — visibility is driven
   * solely by `hasLabel`/`label`. Threaded through so component authors can
   * apply placement-specific styling (`label-placement` attribute) without a
   * second prop; if placement-dependent visibility is ever needed, wire it
   * into `labelVisible$` in `createField()` instead of adding a new option.
   */
  labelPlacement?: Readable<LabelPlacement>;
  prefix?: string;
  validateOn?: Readable<ControlValidationMode>;
};

// ── Error/helper assistive state ──────────────────────────────────────────────

export type ErrorHelperState = {
  errorText: string;
  helperText: string;
};

export type ErrorHelperOptions = {
  error?: Readable<string | undefined>;
  helper?: Readable<string | undefined>;
};

export const createErrorHelperState = (options: ErrorHelperOptions): Readable<ErrorHelperState> =>
  computed(() => ({
    errorText: options.error?.value ?? '',
    helperText: options.helper?.value ?? '',
  }));

// ── Counter state (opt-in) ─────────────────────────────────────────────────────

/** Counter state for text fields with `maxLength`. */
export type CounterState = {
  counterAtLimit: boolean;
  counterNearLimit: boolean;
  counterText: string;
};

export type CounterOptions = {
  maxLength?: Readable<number | undefined>;
  value: Readable<string | undefined>;
};

/**
 * Creates a reactive counter state signal for text fields with `maxLength`.
 * Only call this when `maxLength` may be set — the state is genuinely opt-in.
 *
 * @example
 * ```ts
 * const counter = createCounterState({ value: tf.value, maxLength: props.maxlength });
 * ```
 */
export const createCounterState = (options: CounterOptions): Readable<CounterState> =>
  computed<CounterState>(() => {
    const value = options.value?.value ?? '';
    const maxLength = options.maxLength?.value;
    const parsedMaxLength = Number(maxLength);
    const validMaxLength = Number.isFinite(parsedMaxLength) && parsedMaxLength > 0 ? parsedMaxLength : null;
    const hasCounter = validMaxLength !== null;
    const counterText = hasCounter ? `${value.length} / ${validMaxLength}` : '';
    const ratio = hasCounter ? value.length / validMaxLength : 0;

    return {
      counterAtLimit: hasCounter ? ratio >= 1 : false,
      counterNearLimit: hasCounter ? ratio >= 0.9 && ratio < 1 : false,
      counterText,
    };
  });

// ── Label placement ───────────────────────────────────────────────────────────

export type LabelPlacement = 'inset' | 'outside' | undefined;

// ── Field handle ──────────────────────────────────────────────────────────────

/**
 * Common handle returned by `createField` — the base for both `TextFieldHandle`
 * and `ChoiceFieldHandle`.
 *
 * ARIA signals and label state are flat on the handle — no nested `aria` or
 * `label` sub-objects.
 *
 * @example
 * ```html
 * <label id="${labelId}" ?hidden="${() => !labelVisible.value}">...</label>
 * <input
 *   :aria-labelledby="${ariaLabelledBy}"
 *   :aria-describedby="${ariaDescribedBy}"
 *   :aria-invalid="${ariaInvalid}" />
 * ```
 */
/** Flat ARIA attribute bag ready to spread into a template bind call. */
export type AriaProps = {
  'aria-describedby': string | null;
  'aria-errormessage': string | null;
  'aria-invalid': 'true' | null;
  'aria-labelledby': string | null;
};

export type FieldHandle = {
  /** `aria-describedby` value. Non-null when helper or error text is present. */
  ariaDescribedBy: Readable<string | null>;
  /** `aria-errormessage` value. Non-null when error text is present. */
  ariaErrorMessage: Readable<string | null>;
  /** `aria-invalid` value. `'true'` when error text is present, otherwise `null`. */
  ariaInvalid: Readable<'true' | null>;
  /** `aria-labelledby` value. Non-null when a label is visible. */
  ariaLabelledBy: Readable<string | null>;
  /**
   * Returns a snapshot of the four ARIA attributes as a plain object.
   * Spread into a template bind call to avoid repeating each signal individually.
   *
   * @example
   * ```ts
   * bind(inputEl, { attr: field.ariaProps() });
   * ```
   */
  ariaProps(): AriaProps;
  /**
   * The stable `id` used for `aria-describedby` on the input. Points at the
   * assistive-text region (covers both helper text and error text per WAI-ARIA).
   */
  assistiveId: string;
  disabled: Readable<boolean>;
  /** Stable `id` for the inline error message element (`aria-errormessage`). */
  errorId: string;
  /** Reactive error text. Empty string when no error is set. */
  errorText: Readable<string>;
  fieldId: string;
  /** Reactive helper text. Empty string when no helper is set. */
  helperText: Readable<string>;
  /** Stable `id` for the label element. Stamp this on your `<label id="...">`. */
  labelId: string;
  /** Whether the label should be visible. Use to toggle `hidden` on the `<label>`. */
  labelVisible: Readable<boolean>;
  triggerValidation: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
};

/**
 * Composes the field triad — IDs, assistive state, and label state — into a
 * single `FieldHandle`. Both `createTextField` and `createChoiceField` build
 * on top of this.
 */
export const createField = (options: FieldOptions): FieldHandle => {
  // ── Core ──────────────────────────────────────────────────────────────────
  const disabled = computed(() => Boolean(options.disabled?.value));
  const validateOn = options.validateOn;
  const fieldId = options.id ?? createStableId(options.prefix ?? 'field');
  const assistiveId = createStableId('helper');

  const triggerValidation = (on: Extract<ValidationTrigger, 'blur' | 'change'>): void => {
    if (validateOn?.value === on) options.getFormField?.()?.reportValidity();
  };

  // ── Label + ARIA state ────────────────────────────────────────────────────
  const labelId = createStableId('label');
  const errorId = createStableId('error');

  const label$ = options.label ?? computed(() => undefined);

  // Slot-first composition: if the caller provides `hasLabel`, use it instead
  // of deriving visibility purely from the label text signal. This allows
  // components with a `<slot name="label">` to stay visible even when the
  // `label` prop is empty but a slotted label element is present.
  const labelVisible$ = options.hasLabel ?? computed(() => Boolean(label$.value));

  const resolvedAssistive = createErrorHelperState({ error: options.error, helper: options.helper });

  const ariaDescribedBy = computed(() =>
    resolvedAssistive.value.errorText || resolvedAssistive.value.helperText ? assistiveId : null,
  );
  const ariaErrorMessage = computed(() => (resolvedAssistive.value.errorText ? errorId : null));
  const ariaInvalid = computed<'true' | null>(() => (resolvedAssistive.value.errorText ? 'true' : null));
  const ariaLabelledBy = computed(() => (labelVisible$.value ? labelId : null));

  return {
    ariaDescribedBy,
    ariaErrorMessage,
    ariaInvalid,
    ariaLabelledBy,
    ariaProps: () => ({
      'aria-describedby': ariaDescribedBy.value,
      'aria-errormessage': ariaErrorMessage.value,
      'aria-invalid': ariaInvalid.value,
      'aria-labelledby': ariaLabelledBy.value,
    }),
    assistiveId,
    disabled,
    errorId,
    errorText: computed(() => resolvedAssistive.value.errorText),
    fieldId,
    helperText: computed(() => resolvedAssistive.value.helperText),
    labelId,
    labelVisible: labelVisible$,
    triggerValidation,
  };
};
