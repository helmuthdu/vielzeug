import { computed, type ReadonlySignal, signal } from '@vielzeug/ripple';

import { createReactiveBindings } from './a11y-host';
import { createStableId } from './id';

// ── Validation / context types ────────────────────────────────────────────────

export type ValidationTrigger = 'blur' | 'change' | 'input' | 'submit';
export type ControlValidationMode = ValidationTrigger | undefined;

// ── Field options + handle ───────────────────────────────────────────────────

/** Options shared by both `createTextField` and `createChoiceField`. */
export type FieldOptions = {
  disabled?: ReadonlySignal<boolean | undefined>;
  error?: ReadonlySignal<string | undefined>;
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
  hasLabel?: ReadonlySignal<boolean>;
  helper?: ReadonlySignal<string | undefined>;
  /**
   * Label text signal. When provided, `label.inset.show`/`label.outside.show` and
   * `aria.labelledBy` are computed reactively from this value and `labelPlacement`.
   */
  label?: ReadonlySignal<string | undefined>;
  /** Label placement signal. Defaults to `'inset'`. */
  labelPlacement?: ReadonlySignal<LabelPlacement>;
  prefix?: string;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

// ── Error/helper assistive state ──────────────────────────────────────────────

export type ErrorHelperState = {
  errorText: string;
  helperText: string;
};

export type ErrorHelperOptions = {
  error?: ReadonlySignal<string | undefined>;
  helper?: ReadonlySignal<string | undefined>;
};

export const createErrorHelperState = (options: ErrorHelperOptions): ReadonlySignal<ErrorHelperState> =>
  computed(() => ({
    errorText: options.error?.value ?? '',
    helperText: options.helper?.value ?? '',
  }));

// ── Counter + full assistive state ────────────────────────────────────────────

/** Counter state. Used only by text fields with maxLength. */
export type CounterState = {
  counterAtLimit: boolean;
  counterNearLimit: boolean;
  counterText: string;
  hasCounter: boolean;
};

/** Full assistive state for text fields (error + helper + counter). */
export type AssistiveState = CounterState & {
  errorText: string;
  helperText: string;
};

export type AssistiveOptions = ErrorHelperOptions & {
  maxLength?: ReadonlySignal<number | undefined>;
  value?: ReadonlySignal<string | undefined>;
};

export const createAssistiveState = (options: AssistiveOptions): ReadonlySignal<AssistiveState> =>
  computed<AssistiveState>(() => {
    const errorText = options.error?.value ?? '';
    const helperText = options.helper?.value ?? '';
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
      errorText,
      hasCounter,
      helperText,
    };
  });

// ── Label state ───────────────────────────────────────────────────────────────

export type LabelPlacement = 'inset' | 'outside' | undefined;

/**
 * Nested label state returned on every field handle as `field.label`.
 * Groups the inset and outside label into separate sub-objects, each with a
 * stable `id` and a reactive `show` signal.
 *
 * @example
 * ```html
 * <label id="${label.outside.id}" ?hidden="${() => !label.outside.show.value}">...</label>
 * <label id="${label.inset.id}"   ?hidden="${() => !label.inset.show.value}">...</label>
 * ```
 */
export type LabelState = {
  inset: { id: string; show: ReadonlySignal<boolean> };
  outside: { id: string; show: ReadonlySignal<boolean> };
};

// ── Field ARIA state ──────────────────────────────────────────────────────────

/**
 * Reactive ARIA state returned on every field handle as `field.aria`.
 * Each property is a `ReadonlySignal<T>` — use `.value` directly, or pass the
 * signal to craft's `:attr` directive for automatic reactive binding.
 *
 * @example
 * ```html
 * :aria-labelledby="${field.aria.labelledBy}"
 * :aria-describedby="${field.aria.describedBy}"
 * :aria-invalid="${field.aria.invalid}"
 * ```
 */
export type FieldAriaState = {
  /** `aria-describedby` value. Non-null when helper or error text is present. */
  describedBy: ReadonlySignal<string | null>;
  /** `aria-errormessage` value. Non-null when error text is present. */
  errorMessage: ReadonlySignal<string | null>;
  /** `aria-invalid` value. `'true'` when error text is present, otherwise `null`. */
  invalid: ReadonlySignal<'true' | null>;
  /** `aria-labelledby` value. Non-null when a label text signal is provided. */
  labelledBy: ReadonlySignal<string | null>;
};

// ── Field base options ────────────────────────────────────────────────────────

/** Options shared by both `createTextField` and `createChoiceField`. */
export type FieldBaseOptions = FieldOptions;

// ── Field handle ──────────────────────────────────────────────────────────────

/**
 * Common handle returned by `createField` — the base for both `TextFieldHandle`
 * and `ChoiceFieldHandle`.
 */
export type FieldHandle = {
  /**
   * Applies reactive ARIA bindings from `field.aria` to `element` in a single
   * `createReactiveBindings` effect. Wires `aria-labelledby`, `aria-describedby`,
   * `aria-errormessage`, and `aria-invalid`.
   *
   * Pass `signal` for automatic teardown, or call the returned stop function
   * manually.
   *
   * @example
   * ```ts
   * // Inside onElement:
   * onElement(inputRef, (el) => field.applyAria(el, signal));
   * ```
   */
  applyAria: (element: Element, signal?: AbortSignal) => () => void;
  /** Reactive ARIA attribute signals for the underlying input element. */
  aria: FieldAriaState;
  /** Reactive error + helper assistive text. */
  assistive: ReadonlySignal<ErrorHelperState>;
  /**
   * The stable `id` used for `aria-describedby` on the input. Points at the
   * assistive-text region (covers both helper text and error text per WAI-ARIA).
   */
  assistiveId: string;
  bindFormField: (field: { reportValidity(): void }) => void;
  disabled: ReadonlySignal<boolean>;
  /** Stable `id` for the inline error message element (`aria-errormessage`). */
  errorId: string;
  fieldId: string;
  /** Nested label state with stable IDs and reactive show signals. */
  label: LabelState;
  triggerValidation: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
};

/**
 * Composes the field triad — IDs, assistive state, and label state — into a
 * single `FieldHandle`. Both `createTextField` and `createChoiceField` build
 * on top of this.
 *
 * @param customAssistive - Optional override for the assistive-text signal.
 *   Pass `createAssistiveState(...)` to use the richer counter-aware state
 *   (as `createTextField` does), or any other `ReadonlySignal<ErrorHelperState>`
 *   for fully custom assistive content. Defaults to a plain `ErrorHelperState`.
 */
export const createField = (options: FieldOptions, customAssistive?: ReadonlySignal<ErrorHelperState>): FieldHandle => {
  // ── Core (formerly createFieldCore) ──────────────────────────────────────
  const disabled = computed(() => Boolean(options.disabled?.value));
  const validateOn = options.validateOn;
  const fieldId = createStableId(options.prefix ?? 'field');
  const assistiveId = createStableId('helper');

  const formFieldRef = signal<{ reportValidity(): void } | null>(null);

  const bindFormField = (field: { reportValidity(): void }): void => {
    formFieldRef.value = field;
  };

  const triggerValidation = (on: Extract<ValidationTrigger, 'blur' | 'change'>): void => {
    if (validateOn?.value === on) formFieldRef.value?.reportValidity();
  };

  // ── Label + ARIA state ────────────────────────────────────────────────────
  const insetId = createStableId('label');
  const outsideId = `${insetId}-outside`;
  const errorId = createStableId('error');

  const label$ = options.label ?? computed(() => undefined);
  const placement$ = options.labelPlacement ?? computed(() => 'inset' as LabelPlacement);

  // Slot-first composition: if the caller provides `hasLabel`, use it instead
  // of deriving visibility purely from the label text signal. This allows
  // components with a `<slot name="label">` to stay visible even when the
  // `label` prop is empty but a slotted label element is present.
  const labelVisible$ = options.hasLabel ?? computed(() => Boolean(label$.value));

  const resolvedAssistive = customAssistive ?? createErrorHelperState({ error: options.error, helper: options.helper });

  const label: LabelState = {
    inset: {
      id: insetId,
      show: computed(() => labelVisible$.value && placement$.value !== 'outside'),
    },
    outside: {
      id: outsideId,
      show: computed(() => labelVisible$.value && placement$.value === 'outside'),
    },
  };

  const aria: FieldAriaState = {
    describedBy: computed(() =>
      resolvedAssistive.value.errorText || resolvedAssistive.value.helperText ? assistiveId : null,
    ),
    errorMessage: computed(() => (resolvedAssistive.value.errorText ? errorId : null)),
    invalid: computed(() => (resolvedAssistive.value.errorText ? ('true' as const) : null)),
    labelledBy: computed(() => {
      if (!labelVisible$.value) return null;

      return placement$.value === 'outside' ? outsideId : insetId;
    }),
  };

  const applyAria = (element: Element, signal?: AbortSignal): (() => void) =>
    createReactiveBindings(element, {
      aria: {
        'aria-describedby': () => aria.describedBy.value,
        'aria-errormessage': () => aria.errorMessage.value,
        'aria-invalid': () => aria.invalid.value,
        'aria-labelledby': () => aria.labelledBy.value,
      },
      signal,
    }).stop;

  return {
    applyAria,
    aria,
    assistive: resolvedAssistive,
    assistiveId,
    bindFormField,
    disabled,
    errorId,
    fieldId,
    label,
    triggerValidation,
  };
};
