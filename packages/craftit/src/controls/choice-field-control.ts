import { computed, signal, type Signal, watch } from '@vielzeug/stateit';

import { defineField } from '../form';
import {
  createAssistiveState,
  createBaseFieldHandle,
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

export const createChoiceField = <T>(options: ChoiceFieldOptions<T>): ChoiceFieldHandle<T> => {
  const { bindTrigger, ...base } = createBaseFieldHandle(options);
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

    if (
      values.length === selectedValues.value.length &&
      values.every((value, index) => value === selectedValues.value[index])
    ) {
      return;
    }

    replaceSelectedItems(values.map((value) => options.mapControlledValue(value)));
  };

  const field = defineField({
    disabled: base.disabled,
    value: formValue,
  });

  const triggerValidation = bindTrigger(field);

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
    selectedItems: selectedItems as Signal<T[]>,
    selectedValues,
    selectItem,
    toggleItem,
    triggerValidation,
  };
};
