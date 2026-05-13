import { computed, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { defineField, type FormFieldOptions } from '../form';
import { createId } from '../internal';
import { listen } from '../runtime';
import {
  createControlState,
  type ControlContextOptions,
  type ControlValidationMode,
  type FormControlValidationTrigger,
} from './internal/control-state';

export type { FormControlValidationTrigger } from './internal/control-state';
export type { ValidationReporter } from './internal/control-state';

export type TextFieldControlContext = ControlContextOptions;

export type FieldBaseOptions = {
  context?: TextFieldControlContext;
  disabled?: ReadonlySignal<boolean | undefined>;
  error?: ReadonlySignal<string | undefined>;
  helper?: ReadonlySignal<string | undefined>;
  name?: ReadonlySignal<string | undefined>;
  prefix: string;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

export type TextFieldOptions = FieldBaseOptions & {
  elementRef?: { value: HTMLInputElement | HTMLTextAreaElement | null };
  maxLength?: ReadonlySignal<number | undefined>;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
  onInputExtra?: (event: Event) => void;
  value: ReadonlySignal<string | undefined>;
};

export type ChoiceFieldOptions = FieldBaseOptions & {
  multiple?: ReadonlySignal<boolean | undefined>;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableStateOptions = FieldBaseOptions & {
  checked: ReadonlySignal<boolean | undefined>;
  clearIndeterminateFirst?: boolean;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  indeterminate?: ReadonlySignal<boolean | undefined>;
  onToggle?: (payload: CheckableChangePayload) => void;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableChangePayload = {
  checked: boolean;
  originalEvent?: Event;
  value: string;
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

export type TextFieldHandle = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  clear: (event?: Event) => void;
  value: Signal<string>;
};

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

export type TextFieldLifecycleOptions = {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
  triggerValidation?: (on: FormControlValidationTrigger) => void;
};

export type CheckableStateHandle = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  checked: Signal<boolean>;
  indeterminate: Signal<boolean>;
  toggle: (event: Event) => void;
  value: Signal<string>;
};

export type ChoiceFieldHandle = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  clear: () => void;
  formValue: ReadonlySignal<string>;
  removeValue: (value: string) => void;
  selectedValues: ReadonlySignal<string[]>;
  selectValue: (value: string) => void;
  setValues: (values: string[]) => void;
  toggleValue: (value: string) => void;
};

/**
 * Generates a stable set of ARIA-related IDs for a field control.
 * Snapshot `name` at call time — IDs are stable strings, not reactive.
 */
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

export const createFieldControlBase = <T = unknown>(
  options: {
    context?: TextFieldControlContext;
    name?: ReadonlySignal<string | undefined>;
    prefix: string;
  } & ControlContextOptions,
  fieldOptions: Omit<FormFieldOptions<T>, 'disabled'> & {
    disabled?: FormFieldOptions<T>['disabled'];
  },
): {
  base: Omit<FieldControlBaseHandle, 'triggerValidation'>;
  triggerValidation: (on: FormControlValidationTrigger) => void;
} => {
  const controlState = createControlState(options);
  const ids = createFieldIds(options.prefix, options.name?.value);

  const base: Omit<FieldControlBaseHandle, 'triggerValidation'> = {
    disabled: controlState.disabled,
    errorId: ids.errorId,
    fieldId: ids.fieldId,
    helperId: ids.helperId,
    labelInsetId: ids.labelInsetId,
    labelOutsideId: ids.labelOutsideId,
  };

  const field = defineField<T>({
    ...fieldOptions,
    disabled: fieldOptions.disabled ?? base.disabled,
  });

  return {
    base,
    triggerValidation: (on) => controlState.triggerValidation(field, on),
  };
};

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

/** @internal */
export const mountTextFieldLifecycle = (options: TextFieldLifecycleOptions): (() => void) => {
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
