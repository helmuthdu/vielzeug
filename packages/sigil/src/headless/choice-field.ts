import { computed, type ReadonlySignal, signal, watch } from '@vielzeug/ripple';

import {
  createField,
  type ErrorHelperState,
  type FieldAriaState,
  type FieldHandle,
  type FieldBaseOptions,
  type LabelState,
} from './field-base';

// ── Choice change event payload ──────────────────────────────────────────────────────────────

export type ChoiceChangeDetail = {
  labels: string[];
  originalEvent?: Event;
  values: string[];
};

// ── Choice field ──────────────────────────────────────────────────────────────────────

export type ChoiceFieldOptions = FieldBaseOptions & {
  multiple?: ReadonlySignal<boolean | undefined>;
  /**
   * Current selection value(s). Accepts a comma-separated string
   * (legacy/single-select form serialisation) or a `string[]` array.
   * The field normalises both formats internally via `parseChoiceValues`.
   */
  value: ReadonlySignal<string | string[] | undefined>;
};

export type ChoiceFieldHandle = FieldHandle & {
  /** Reactive ARIA attribute getters for the trigger element. */
  aria: FieldAriaState;
  /** Reactive error + helper assistive text. */
  assistive: ReadonlySignal<ErrorHelperState>;
  clear: () => void;
  formValue: ReadonlySignal<string>;
  /** Grouped label IDs and visibility getters. */
  label: LabelState;
  removeValue: (value: string) => void;
  selectedValue: ReadonlySignal<string | undefined>;
  selectedValues: ReadonlySignal<string[]>;
  selectValue: (value: string) => void;
  setValues: (values: string[]) => void;
  toggleValue: (value: string) => void;
};

const parseChoiceValues = (raw: string | string[] | undefined): string[] => {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw.filter(Boolean);

  return raw
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

  const normalizeValues = (values: string[]): string[] => {
    const normalized = isMultiple.value ? values : values.slice(0, 1);

    return [...new Set(normalized.filter(Boolean))];
  };

  const setValues = (values: string[]): void => {
    selectedValues.value = normalizeValues(values);
  };
  const clear = (): void => setValues([]);
  const removeValue = (value: string): void => {
    selectedValues.value = selectedValues.value.filter((v) => v !== value);
  };

  const selectValue = (value: string): void => {
    if (isMultiple.value) {
      if (!selectedValues.value.includes(value)) setValues([...selectedValues.value, value]);

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

  const syncFromProp = (nextValue: string | string[] | undefined): void => {
    setValues(parseChoiceValues(nextValue));
  };

  const field = createField(options);

  watch(options.value, syncFromProp, { immediate: true });

  if (options.multiple) {
    watch(options.multiple, () => syncFromProp(options.value.value));
  }

  return {
    ...field,
    clear,
    formValue,
    removeValue,
    selectedValue: computed(() => selectedValues.value[0]),
    selectedValues,
    selectValue,
    setValues,
    toggleValue,
  };
};
