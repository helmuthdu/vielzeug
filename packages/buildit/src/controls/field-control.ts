import { computed, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { createId, defineField, listen, type FormFieldOptions } from '@vielzeug/craftit';

// ── Validation / context types ────────────────────────────────────────────────

export type FormControlValidationTrigger = 'blur' | 'change';
export type ControlValidationMode = 'blur' | 'change' | 'submit' | 'input' | undefined;
export type ValidationReporter = { reportValidity: () => void };

export type ControlContextOptions = {
  disabled?: ReadonlySignal<boolean | undefined>;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

// ── Field base options / handle ───────────────────────────────────────────────

export type FieldBaseOptions = {
  context?: ControlContextOptions;
  disabled?: ReadonlySignal<boolean | undefined>;
  error?: ReadonlySignal<string | undefined>;
  helper?: ReadonlySignal<string | undefined>;
  name?: ReadonlySignal<string | undefined>;
  prefix: string;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

export type FieldControlBaseHandle = {
  disabled: ReadonlySignal<boolean>;
  errorId: string;
  fieldId: string;
  helperId: string;
  labelInsetId: string;
  labelOutsideId: string;
  triggerValidation: (on: FormControlValidationTrigger) => void;
};

// ── Assistive state ───────────────────────────────────────────────────────────

export type AssistiveState = {
  counterAtLimit: boolean;
  counterNearLimit: boolean;
  counterText: string;
  errorText: string;
  hasCounter: boolean;
  helperText: string;
};

export type AssistiveOptions = {
  error?: ReadonlySignal<string | undefined>;
  helper?: ReadonlySignal<string | undefined>;
  maxLength?: ReadonlySignal<number | undefined>;
  value?: ReadonlySignal<string | undefined>;
};

// ── Text field DOM listener options ──────────────────────────────────────────

export type TextFieldListenerOptions = {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
  triggerValidation?: (on: FormControlValidationTrigger) => void;
};

// ── Internal: stable ID generation ───────────────────────────────────────────

const createFieldIds = (prefix: string, name?: string | null) => {
  const normalizedName = name && name.trim() ? name.trim() : createId().replace(/^cft-/, '');
  const fieldId = `${prefix}-${normalizedName}`;
  const labelInsetId = `label-${fieldId}`;

  return {
    errorId: `error-${fieldId}`,
    fieldId,
    helperId: `helper-${fieldId}`,
    labelInsetId,
    labelOutsideId: `${labelInsetId}-outside`,
  };
};

// ── Core field factory ────────────────────────────────────────────────────────

export const createFieldControlBase = <T = unknown>(
  options: Pick<FieldBaseOptions, 'context' | 'disabled' | 'name' | 'prefix' | 'validateOn'>,
  fieldOptions: Omit<FormFieldOptions<T>, 'disabled'> & { disabled?: FormFieldOptions<T>['disabled'] },
): FieldControlBaseHandle => {
  const disabled = computed(
    () => Boolean(options.disabled?.value) || Boolean(options.context?.disabled?.value),
  );
  const validateOn = options.validateOn ?? options.context?.validateOn;
  const ids = createFieldIds(options.prefix, options.name?.value);

  const field = defineField<T>({
    ...fieldOptions,
    disabled: fieldOptions.disabled ?? disabled,
  });

  return {
    disabled,
    errorId: ids.errorId,
    fieldId: ids.fieldId,
    helperId: ids.helperId,
    labelInsetId: ids.labelInsetId,
    labelOutsideId: ids.labelOutsideId,
    triggerValidation: (on) => {
      if (validateOn?.value === on) field.reportValidity();
    },
  };
};

// ── Assistive state factory ───────────────────────────────────────────────────

export const createAssistiveState = (options: AssistiveOptions) => {
  return computed<AssistiveState>(() => {
    const value = options.value?.value ?? '';
    const errorText = options.error?.value ?? '';
    const helperText = options.helper?.value ?? '';
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
};

// ── Text field DOM listeners ──────────────────────────────────────────────────

export const attachTextFieldListeners = (options: TextFieldListenerOptions): (() => void) => {
  const { element, onBlur, onChange, onInput, triggerValidation } = options;
  const disposers: Array<() => void> = [];

  if (onInput) {
    disposers.push(
      listen(element, 'input', (event: Event) => {
        // Prevent the native composed event from bubbling out of the shadow DOM
        // and being re-targeted onto the host element. The component emits its
        // own structured CustomEvent so external listeners never need the raw one.
        event.stopPropagation();
        onInput(event, element.value);
      }),
    );
  }

  disposers.push(
    listen(element, 'change', (event: Event) => {
      // Same reason as above — suppress the native change event from escaping.
      event.stopPropagation();
      onChange?.(event, element.value);
      triggerValidation?.('change');
    }),
  );

  disposers.push(
    listen(element, 'blur', (event: Event) => {
      onBlur?.(event as FocusEvent);
      triggerValidation?.('blur');
    }),
  );

  return () => {
    for (const dispose of disposers) dispose();
  };
};

// Keep Signal in scope for re-export use by sub-modules
export type { Signal };
