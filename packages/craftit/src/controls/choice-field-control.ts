import { computed, signal, watch } from '@vielzeug/stateit';

import {
  createAssistiveState,
  createFieldControlBase,
  type ChoiceFieldHandle,
  type ChoiceFieldOptions,
} from './field-control';

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
    const uniqueValues: string[] = [];
    const seen = new Set<string>();

    for (const value of normalized.map((entry) => String(entry ?? '')).filter(Boolean)) {

      if (seen.has(value)) continue;

      seen.add(value);
      uniqueValues.push(value);
    }

    return uniqueValues;
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
    const values = parseChoiceFieldValues(typeof nextValue === 'string' ? nextValue : String(nextValue ?? ''));

    if (
      values.length === selectedValues.value.length &&
      values.every((value, index) => value === selectedValues.value[index])
    ) {
      return;
    }

    setValues(values);
  };

  const { base, triggerValidation } = createFieldControlBase(options, { value: formValue });

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
