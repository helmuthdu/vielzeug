import { createStableId } from '@vielzeug/ore';
import { computed, type Readable } from '@vielzeug/ripple';

import { warn } from '../_dev';

// ── Validation / context types ────────────────────────────────────────────────

export type ValidationTrigger = 'blur' | 'change' | 'input' | 'submit';
export type ControlValidationMode = ValidationTrigger | undefined;

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

/**
 * The single implementation of "which modifier class does this counter state map to" —
 * every field with a character counter (`ore-input`, `ore-textarea`, `ore-message-composer`)
 * renders the identical near-limit/at-limit styling, so this is the one place that decides it.
 *
 * @example
 * ```ts
 * html`<span class="${() => counterClassName(counter?.value)}">...</span>`
 * ```
 */
export const counterClassName = (counter: CounterState | undefined, base = 'counter'): string => {
  if (!counter) return base;

  if (counter.counterAtLimit) return `${base} at-limit`;

  if (counter.counterNearLimit) return `${base} near-limit`;

  return base;
};

// ── Label placement ───────────────────────────────────────────────────────────

export type LabelPlacement = 'inset' | 'outside' | undefined;

// ── Assistive state (error/helper text, describedby/errormessage/invalid) ─────

/**
 * A field's error/helper/disabled/validation-trigger state — everything an input
 * needs *except* a visible `<label>`. Split out from label state (below) because
 * not every field has one: `ore-message-composer` names itself via `aria-label`
 * (a chat composer's accessible name conventionally comes from context/placeholder,
 * not a floating `<label>`), so it composes this directly instead of pulling in
 * label plumbing it can't use. `createField()` composes both for fields that do
 * render a `<label>`.
 */
export type AssistiveStateHandle = {
  /** `aria-describedby` value. Non-null when helper or error text is present. */
  ariaDescribedBy: Readable<string | null>;
  /** `aria-errormessage` value. Non-null when error text is present. */
  ariaErrorMessage: Readable<string | null>;
  /** `aria-invalid` value. `'true'` when error text is present, otherwise `null`. */
  ariaInvalid: Readable<'true' | null>;
  /**
   * The stable `id` used for `aria-describedby` on the input. Points at the
   * assistive-text region (covers both helper text and error text per WAI-ARIA).
   */
  assistiveId: string;
  /**
   * Registers the real form field handle (the return value of `useField()`) so that
   * `triggerValidation()` can call its `reportValidity()`. See `TextFieldHandle.attachFormField`
   * for why this is a post-hoc call instead of a constructor option — the same forward
   * reference applies here for choice fields.
   */
  attachFormField: (formField: { reportValidity(): void }) => void;
  disabled: Readable<boolean>;
  /** Stable `id` for the inline error message element (`aria-errormessage`). */
  errorId: string;
  /** Reactive error text. Empty string when no error is set. */
  errorText: Readable<string>;
  /** Reactive helper text. Empty string when no helper is set. */
  helperText: Readable<string>;
  triggerValidation: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
};

export type AssistiveStateOptions = {
  disabled?: Readable<boolean | undefined>;
  error?: Readable<string | undefined>;
  helper?: Readable<string | undefined>;
  validateOn?: Readable<ControlValidationMode>;
};

export const createAssistiveState = (options: AssistiveStateOptions): AssistiveStateHandle => {
  const disabled = computed(() => Boolean(options.disabled?.value));
  const assistiveId = createStableId('helper');
  const errorId = createStableId('error');
  const resolvedAssistive = createErrorHelperState({ error: options.error, helper: options.helper });

  const ariaDescribedBy = computed(() =>
    resolvedAssistive.value.errorText || resolvedAssistive.value.helperText ? assistiveId : null,
  );
  const ariaErrorMessage = computed(() => (resolvedAssistive.value.errorText ? errorId : null));
  const ariaInvalid = computed<'true' | null>(() => (resolvedAssistive.value.errorText ? 'true' : null));

  let formField: { reportValidity(): void } | null = null;
  const attachFormField = (nextFormField: { reportValidity(): void }): void => {
    formField = nextFormField;
  };

  const triggerValidation = (on: Extract<ValidationTrigger, 'blur' | 'change'>): void => {
    if (options.validateOn?.value !== on) return;

    if (!formField) {
      // Not user-facing — this only fires when a component author wired `validateOn` but
      // forgot the matching `attachFormField(useField(...))` call, so validation silently
      // never runs instead of erroring where the mistake actually is.
      warn(
        "triggerValidation() called before attachFormField() — validation will not run. See createTextField()/createChoiceField()/createCheckable()'s attachFormField doc comment.",
      );

      return;
    }

    formField.reportValidity();
  };

  return {
    ariaDescribedBy,
    ariaErrorMessage,
    ariaInvalid,
    assistiveId,
    attachFormField,
    disabled,
    errorId,
    errorText: computed(() => resolvedAssistive.value.errorText),
    helperText: computed(() => resolvedAssistive.value.helperText),
    triggerValidation,
  };
};

// ── Label state (visible `<label>` + `aria-labelledby`) ────────────────────────

export type LabelStateHandle = {
  /** `aria-labelledby` value. Non-null when a label is visible. */
  ariaLabelledBy: Readable<string | null>;
  /** Stable `id` for the underlying form control — the `<label for="...">` target. */
  fieldId: string;
  /** Stable `id` for the label element. Stamp this on your `<label id="...">`. */
  labelId: string;
  /** Whether the label should be visible. Use to toggle `hidden` on the `<label>`. */
  labelVisible: Readable<boolean>;
};

export type LabelStateOptions = {
  /**
   * Override for label visibility that takes precedence over deriving it from
   * the `label` text signal. Pass a computed signal that checks both prop and
   * slot presence to enable slot-first composition.
   *
   * @example
   * ```ts
   * const hasLabel = computed(() => !!props.label.value || slots.has('label').value);
   * const label = createLabelState({ ...options, hasLabel });
   * ```
   */
  hasLabel?: Readable<boolean>;
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
   * Not consumed by `createLabelState()` itself — visibility is driven solely by
   * `hasLabel`/`label`. Threaded through so component authors can apply
   * placement-specific styling (`label-placement` attribute) without a second
   * option; if placement-dependent visibility is ever needed, wire it into
   * `labelVisible` here instead of adding a new option.
   */
  labelPlacement?: Readable<LabelPlacement>;
  prefix?: string;
};

export const createLabelState = (options: LabelStateOptions): LabelStateHandle => {
  const fieldId = options.id ?? createStableId(options.prefix ?? 'field');
  const labelId = createStableId('label');
  const label$ = options.label ?? computed(() => undefined);

  // Slot-first composition: if the caller provides `hasLabel`, use it instead
  // of deriving visibility purely from the label text signal. This allows
  // components with a `<slot name="label">` to stay visible even when the
  // `label` prop is empty but a slotted label element is present.
  const labelVisible = options.hasLabel ?? computed(() => Boolean(label$.value));
  const ariaLabelledBy = computed(() => (labelVisible.value ? labelId : null));

  return { ariaLabelledBy, fieldId, labelId, labelVisible };
};

// ── Field handle (assistive + label, composed) ──────────────────────────────

/**
 * Common handle returned by `createField` — the base for both `TextFieldHandle`
 * and `ChoiceFieldHandle`. Composes `createAssistiveState` + `createLabelState`;
 * call those directly instead if a field has no visible `<label>` (see
 * `createAssistiveState`'s doc comment).
 *
 * ARIA signals and label state are flat on the handle — no nested `aria` or
 * `label` sub-objects. `labelId`/`labelVisible`/`ariaLabelledBy` are always
 * present but only meaningful when `label`/`hasLabel` was passed — omit both
 * and they resolve to an always-hidden, unreferenced label.
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
export type FieldHandle = AssistiveStateHandle & LabelStateHandle;

/** Options shared by both `createTextField` and `createChoiceField`. */
export type FieldOptions = AssistiveStateOptions & LabelStateOptions;

export const createField = (options: FieldOptions): FieldHandle => ({
  ...createAssistiveState(options),
  ...createLabelState(options),
});
