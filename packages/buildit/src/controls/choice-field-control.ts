import { type ReadonlySignal, computed, signal, watch } from '@vielzeug/stateit';

import {
  createAssistiveState,
  createFieldControlBase,
  type AssistiveState,
  type FieldBaseOptions,
  type FieldControlBaseHandle,
  type FormControlValidationTrigger,
} from './field-control';

export type ChoiceFieldOptions = FieldBaseOptions & {
  multiple?: ReadonlySignal<boolean | undefined>;
  value: ReadonlySignal<string | undefined>;
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
  triggerValidation: (on: FormControlValidationTrigger) => void;
};

const parseChoiceFieldValues = (value: string | undefined): string[] => {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const createChoiceField = (options: ChoiceFieldOptions): ChoiceFieldHandle => {
  const selectedValues = signal<string[]>([]);
  const isMultiple = computed(() => Boolean(options.multiple?.value));
  const formValue = computed(() =>
    isMultiple.value ? selectedValues.value.join(',') : (selectedValues.value[0] ?? ''),
  );

  const normalizeSelectedValues = (values: string[]): string[] => {
    const normalized = isMultiple.value ? values : values.slice(0, 1);

    return [...new Set(normalized.map((entry) => String(entry ?? '')).filter(Boolean))];
  };

  const setValues = (values: string[]): void => {
    selectedValues.value = normalizeSelectedValues(values);
  };

  const clear = (): void => {
    setValues([]);
  };

  const removeValue = (value: string): void => {
    selectedValues.value = selectedValues.value.filter((current) => current !== value);
  };

  const selectValue = (value: string): void => {
    if (isMultiple.value) {
      if (selectedValues.value.includes(value)) return;

      setValues([...selectedValues.value, value]);

      return;
    }

    setValues([value]);
  };

  const toggleValue = (value: string): void => {
    if (isMultiple.value) {
      if (selectedValues.value.includes(value)) {
        removeValue(value);

        return;
      }

      setValues([...selectedValues.value, value]);

      return;
    }

    setValues([value]);
  };

  const syncControlledValue = (nextValue: unknown): void => {
    setValues(parseChoiceFieldValues(typeof nextValue === 'string' ? nextValue : String(nextValue ?? '')));
  };

  const { triggerValidation, ...base } = createFieldControlBase(options, { value: formValue });

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
    formValue,
    removeValue,
    selectedValues,
    selectValue,
    setValues,
    toggleValue,
    triggerValidation,
  };
};
