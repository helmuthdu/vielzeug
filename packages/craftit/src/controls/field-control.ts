import { computed, isSignal, type ReadonlySignal, type Signal, signal } from '@vielzeug/stateit';

import { spread } from '../directives/spread';
import { defineField, type FormFieldHandle } from '../form';
import { createId, ref, type Directive } from '../internal';
import { effect, handle, onElement, watch } from '../runtime-lifecycle';
import {
  createControlState,
  type ControlContextOptions,
  type ControlValidationMode,
  type FormControlValidationTrigger,
} from './internal/control-state';

export type { FormControlValidationTrigger } from './internal/control-state';
export { createValidationControl } from './internal/control-state';
export type { ValidationReporter } from './internal/control-state';

// Discriminated union types for text vs checkable variants
export type TextFieldControlContext = {
  disabled?: ReadonlySignal<boolean | undefined>;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

export type TextFieldOptions = Omit<ControlContextOptions, 'disabled' | 'validateOn'> & {
  autocomplete?: ReadonlySignal<string | undefined>;
  context?: TextFieldControlContext;
  disabled?: ReadonlySignal<boolean | undefined>;
  elementRef?: { value: HTMLInputElement | HTMLTextAreaElement | null };
  error?: ReadonlySignal<string | undefined>;
  helper?: ReadonlySignal<string | undefined>;
  inputmode?: ReadonlySignal<string | undefined>;
  label?: ReadonlySignal<string | undefined>;
  labelPlacement?: ReadonlySignal<'inset' | 'outside' | undefined>;
  maxLength?: ReadonlySignal<number | undefined>;
  minLength?: ReadonlySignal<number | undefined>;
  name?: ReadonlySignal<string | undefined>;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
  onInputExtra?: (event: Event) => void;
  onReset?: () => void;
  pattern?: ReadonlySignal<string | undefined>;
  placeholder?: ReadonlySignal<string | undefined>;
  prefix: string;
  readOnly?: ReadonlySignal<boolean | undefined>;
  required?: ReadonlySignal<boolean | undefined>;
  rows?: ReadonlySignal<number | undefined>;
  type?: ReadonlySignal<string | undefined> | (() => string | undefined) | string;
  validateOn?: ReadonlySignal<ControlValidationMode>;
  value: ReadonlySignal<string | undefined>;
};

export type ChoiceFieldOptions<T> = {
  context?: TextFieldControlContext;
  disabled?: ReadonlySignal<boolean | undefined>;
  error?: ReadonlySignal<string | undefined>;
  getValue: (item: T) => string;
  helper?: ReadonlySignal<string | undefined>;
  label?: ReadonlySignal<string | undefined>;
  labelPlacement?: ReadonlySignal<'inset' | 'outside' | undefined>;
  mapControlledValue: (value: string) => T;
  multiple?: ReadonlySignal<boolean | undefined>;
  name?: ReadonlySignal<string | undefined>;
  onReset?: () => void;
  prefix: string;
  validateOn?: ReadonlySignal<ControlValidationMode>;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableStateOptions = ControlContextOptions & {
  checked: ReadonlySignal<boolean | undefined>;
  clearIndeterminateFirst?: boolean;
  error?: ReadonlySignal<string | undefined>;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  helper?: ReadonlySignal<string | undefined>;
  indeterminate?: ReadonlySignal<boolean | undefined>;
  label?: ReadonlySignal<string | undefined>;
  labelPlacement?: ReadonlySignal<'inset' | 'outside' | undefined>;
  name?: ReadonlySignal<string | undefined>;
  onReset?: () => void;
  onToggle?: (payload: CheckableChangePayload) => void;
  prefix: string;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableChangePayload = {
  checked: boolean;
  fieldValue: string;
  originalEvent?: Event;
};

export type FieldControlBaseHandle = {
  disabled: ReadonlySignal<boolean>;
  errorId: string;
  field: FormFieldHandle;
  fieldId: string;
  helperId: string;
  labelInsetId: string;
  labelInsetRef: { value: HTMLLabelElement | null };
  labelOutsideId: string;
  labelOutsideRef: { value: HTMLLabelElement | null };
  triggerValidation: (on: FormControlValidationTrigger) => void;
  validateOn: ReadonlySignal<ControlValidationMode> | undefined;
};

export type TextFieldHandle = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  attrs: Directive;
  clear: (event?: Event) => void;
  value: Signal<string>;
};

export type AssistiveState = {
  counterAtLimit: boolean;
  counterNearLimit: boolean;
  counterText: string;
  errorText: string;
  hasCounter: boolean;
  hasError: boolean;
  hasHelper: boolean;
  helperText: string;
  hidden: boolean;
  isError: boolean;
  showHelper: boolean;
  text: string;
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

export type ChoiceFieldHandle<T> = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  clear: () => void;
  field: FormFieldHandle;
  formValue: ReadonlySignal<string>;
  isMultiple: ReadonlySignal<boolean>;
  isSelected: (value: string) => boolean;
  removeValue: (value: string) => void;
  replaceSelectedItems: (items: T[]) => void;
  selectedItems: Signal<T[]>;
  selectedValues: ReadonlySignal<string[]>;
  selectItem: (item: T) => void;
  toggleItem: (item: T) => void;
};

type ReactiveValue<T> = ReadonlySignal<T> | (() => T) | T;

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

const createBaseFieldHandle = (
  options: {
    label?: ReadonlySignal<string | undefined>;
    labelPlacement?: ReadonlySignal<'inset' | 'outside' | undefined>;
    name?: ReadonlySignal<string | undefined>;
    prefix: string;
  } & ControlContextOptions,
) => {
  const controlState = createControlState(options);
  const ids = createFieldIds(options.prefix, options.name?.value);
  const labelInsetRef = ref<HTMLLabelElement>();
  const labelOutsideRef = ref<HTMLLabelElement>();

  const syncLabels = () => {
    const placement = options.labelPlacement?.value ?? 'inset';
    const text = options.label?.value ?? '';

    if (labelInsetRef.value) {
      labelInsetRef.value.textContent = text;
      labelInsetRef.value.hidden = !text || placement !== 'inset';
    }

    if (labelOutsideRef.value) {
      labelOutsideRef.value.textContent = text;
      labelOutsideRef.value.hidden = !text || placement !== 'outside';
    }
  };

  effect(syncLabels);

  return {
    disabled: controlState.disabled,
    errorId: ids.errorId,
    fieldId: ids.fieldId,
    helperId: ids.helperId,
    labelInsetId: ids.labelInsetId,
    labelInsetRef,
    labelOutsideId: ids.labelOutsideId,
    labelOutsideRef,
    triggerValidation: (field: FormFieldHandle, on: FormControlValidationTrigger) =>
      controlState.triggerValidation(field, on),
    validateOn: controlState.validateOn,
  };
};

const resolveControlContext = (options: {
  context?: TextFieldControlContext;
  disabled?: ReadonlySignal<boolean | undefined>;
  validateOn?: ReadonlySignal<ControlValidationMode>;
}) => {
  return {
    disabled: computed(() => Boolean(options.disabled?.value) || Boolean(options.context?.disabled?.value)),
    validateOn: options.validateOn ?? options.context?.validateOn,
  };
};

export const createAssistiveState = (options: AssistiveOptions) => {
  return computed<AssistiveState>(() => {
    const value = options.value?.value ?? '';
    const errorText = options.error?.value ?? '';
    const helperText = options.helper?.value ?? '';
    const hasError = Boolean(errorText);
    const hasHelper = Boolean(helperText);
    const text = errorText || helperText || '';
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
      hasError,
      hasHelper,
      helperText,
      hidden: !text,
      isError: hasError,
      showHelper: !hasError && hasHelper,
      text,
    };
  });
};

const resolveReactiveValue = <T>(value: ReactiveValue<T> | undefined): T | undefined => {
  if (value === undefined) return undefined;

  if (isSignal(value)) return (value as ReadonlySignal<T>).value;

  if (typeof value === 'function') return (value as () => T)();

  return value;
};

const optionalStringSource = (value: ReactiveValue<string | undefined> | undefined): (() => string | undefined) => {
  return () => {
    const next = resolveReactiveValue(value);

    if (next == null || next === '') return undefined;

    return String(next);
  };
};

const optionalNumberSource = (value: ReactiveValue<number | undefined> | undefined): (() => number | undefined) => {
  return () => {
    const next = resolveReactiveValue(value);

    if (next == null || Number.isNaN(Number(next)) || Number(next) <= 0) return undefined;

    return Number(next);
  };
};

export const createTextFieldControl = (options: TextFieldOptions): TextFieldHandle => {
  const value = signal('');
  const controlContext = resolveControlContext(options);
  const base = createBaseFieldHandle({
    ...options,
    ...controlContext,
  });

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const field = defineField(
    {
      disabled: base.disabled,
      value,
    },
    {
      onReset: () => {
        value.value = '';
        options.onReset?.();
      },
    },
  );

  const assistive = createAssistiveState({
    error: options.error,
    helper: options.helper,
    maxLength: options.maxLength,
    value,
  });

  const clear = (event?: Event): void => {
    event?.preventDefault?.();

    value.value = '';
    options.onInput?.(event ?? new Event('input'), '');
    options.onChange?.(event ?? new Event('change'), '');
    base.triggerValidation(field, 'change');
    options.elementRef?.value?.focus();
  };

  if (options.elementRef) {
    onElement(options.elementRef, (element) => {
      mountTextFieldLifecycle({
        element,
        onBlur: options.onBlur,
        onChange: options.onChange,
        onInput: (event, nextValue) => {
          options.onInputExtra?.(event);
          options.onInput?.(event, nextValue);
        },
        triggerValidation: (on) => base.triggerValidation(field, on),
      });
    });
  }

  const attrs = spread({
    '?required': options.required,
    '.disabled': options.disabled,
    '.readOnly': options.readOnly,
    '.type': options.type,
    '.value': value,
    autocomplete: optionalStringSource(options.autocomplete),
    inputmode: optionalStringSource(options.inputmode),
    maxlength: optionalNumberSource(options.maxLength),
    minlength: optionalNumberSource(options.minLength),
    name: optionalStringSource(options.name),
    pattern: optionalStringSource(options.pattern),
    placeholder: optionalStringSource(options.placeholder),
    rows: optionalNumberSource(options.rows),
  });

  return {
    assistive,
    attrs,
    ...base,
    clear,
    field,
    triggerValidation: (on: FormControlValidationTrigger) => base.triggerValidation(field, on),
    value,
  };
};

export const mountTextFieldLifecycle = (options: TextFieldLifecycleOptions): void => {
  const { element, onBlur, onChange, onInput, triggerValidation } = options;

  if (onInput) {
    handle(element, 'input', (event: Event) => {
      onInput(event, element.value);
    });
  }

  handle(element, 'change', (event: Event) => {
    onChange?.(event, element.value);
    triggerValidation?.('change');
  });

  handle(element, 'blur', (event: Event) => {
    onBlur?.(event as FocusEvent);
    triggerValidation?.('blur');
  });
};

const parseChoiceFieldValues = (value: string | undefined): string[] => {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const createChoiceFieldControl = <T>(options: ChoiceFieldOptions<T>): ChoiceFieldHandle<T> => {
  const controlContext = resolveControlContext(options);
  const base = createBaseFieldHandle({
    ...controlContext,
    label: options.label,
    labelPlacement: options.labelPlacement,
    name: options.name,
    prefix: options.prefix,
  });
  const selectedItems = signal<T[]>([]);
  const isMultiple = computed(() => Boolean(options.multiple?.value));
  const selectedValues = computed(() => selectedItems.value.map((item) => options.getValue(item)));
  const formValue = computed(() =>
    isMultiple.value ? selectedValues.value.join(',') : (selectedValues.value[0] ?? ''),
  );

  const normalizeSelectedItems = (items: T[]): T[] => {
    const normalized = isMultiple.value ? items : items.slice(0, 1);
    const uniqueItems: T[] = [];
    const seen = new Set<string>();

    for (const item of normalized) {
      const value = options.getValue(item);

      if (seen.has(value)) continue;

      seen.add(value);
      uniqueItems.push(item);
    }

    return uniqueItems;
  };

  const replaceSelectedItems = (items: T[]): void => {
    selectedItems.value = normalizeSelectedItems(items);
  };

  const clear = (): void => {
    replaceSelectedItems([]);
  };

  const removeValue = (value: string): void => {
    selectedItems.value = selectedItems.value.filter((item) => options.getValue(item) !== value);
  };

  const selectItem = (item: T): void => {
    if (isMultiple.value) {
      const value = options.getValue(item);

      if (selectedItems.value.some((current) => options.getValue(current) === value)) return;

      replaceSelectedItems([...selectedItems.value, item]);

      return;
    }

    replaceSelectedItems([item]);
  };

  const toggleItem = (item: T): void => {
    if (isMultiple.value) {
      const value = options.getValue(item);

      if (selectedItems.value.some((current) => options.getValue(current) === value)) {
        removeValue(value);

        return;
      }

      replaceSelectedItems([...selectedItems.value, item]);

      return;
    }

    replaceSelectedItems([item]);
  };

  const syncControlledValue = (nextValue: unknown): void => {
    const values = parseChoiceFieldValues(typeof nextValue === 'string' ? nextValue : String(nextValue ?? ''));

    replaceSelectedItems(values.map((value) => options.mapControlledValue(value)));
  };

  const field = defineField(
    {
      disabled: base.disabled,
      value: formValue,
    },
    {
      onReset: () => {
        clear();
        options.onReset?.();
      },
    },
  );

  const assistive = createAssistiveState({
    error: options.error,
    helper: options.helper,
  });

  watch(
    options.value,
    (next) => {
      syncControlledValue(next);
    },
    { immediate: true },
  );

  if (options.multiple) {
    watch(options.multiple, () => syncControlledValue(options.value.value));
  }

  return {
    ...base,
    assistive,
    clear,
    field,
    formValue,
    isMultiple,
    isSelected: (value: string) => selectedItems.value.some((item) => options.getValue(item) === value),
    removeValue,
    replaceSelectedItems,
    selectedItems,
    selectedValues,
    selectItem,
    toggleItem,
    triggerValidation: (on: FormControlValidationTrigger) => base.triggerValidation(field, on),
  };
};

export const createCheckableStateControl = (options: CheckableStateOptions): CheckableStateHandle => {
  const value = signal('');
  const base = createBaseFieldHandle(options);
  const checked = signal(Boolean(options.checked.value));
  const indeterminate = signal(Boolean(options.indeterminate?.value));
  const assistive = createAssistiveState({ error: options.error, helper: options.helper });

  watch(
    options.checked,
    (next) => {
      checked.value = Boolean(next);
    },
    { immediate: true },
  );

  if (options.indeterminate) {
    watch(
      options.indeterminate,
      (next) => {
        indeterminate.value = Boolean(next);
      },
      { immediate: true },
    );
  }

  const field = defineField(
    {
      disabled: base.disabled,
      toFormValue: (next: string | null) => next,
      value: computed(() => (checked.value ? (options.value.value ?? '') : null)),
    },
    {
      onReset: () => {
        checked.value = Boolean(options.checked.value);
        indeterminate.value = Boolean(options.indeterminate?.value);
        options.onReset?.();
      },
    },
  );

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    fieldValue: options.value.value ?? '',
    originalEvent: event,
  });

  const toggle = (event: Event): void => {
    if (base.disabled.value) return;

    if (options.group) {
      indeterminate.value = false;
      options.group.toggle(options.value.value ?? '', event);
      options.onToggle?.(createPayload(event));

      return;
    }

    if (options.clearIndeterminateFirst && indeterminate.value) {
      indeterminate.value = false;
    } else {
      checked.value = !checked.value;
      indeterminate.value = false;
    }

    options.onToggle?.(createPayload(event));
  };

  return {
    ...base,
    assistive,
    checked,
    field,
    indeterminate,
    toggle,
    triggerValidation: (on: FormControlValidationTrigger) => base.triggerValidation(field, on),
    value,
  };
};
