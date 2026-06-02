import { computed, type ReadonlySignal, signal, type Subscription, watch } from '@vielzeug/ripple';

import { createField, type FieldHandle, type FieldOptions } from './field-base';

// ── Choice change event payload ──────────────────────────────────────────────────────────────

export type ChoiceChangeDetail = {
  labels: string[];
  originalEvent?: Event;
  values: string[];
};

// ── Choice field ──────────────────────────────────────────────────────────────────────

export type ChoiceFieldOptions = FieldOptions & {
  multiple?: ReadonlySignal<boolean | undefined>;
  /**
   * Optional `AbortSignal` tied to the component lifecycle.
   * When provided, all internal `watch()` subscriptions are disposed automatically
   * on abort — no need to call `cleanup()` manually.
   *
   * Obtain via `componentSignal(onCleanup)` inside a craft `setup()` function.
   */
  signal?: AbortSignal;
  /**
   * Current selection value(s). Accepts a comma-separated string
   * (legacy/single-select form serialisation) or a `string[]` array.
   * The field normalises both formats internally via `parseChoiceValues`.
   */
  value: ReadonlySignal<string | string[] | undefined>;
};

export type ChoiceFieldHandle = FieldHandle & {
  /**
   * Manual cleanup. Disposes all internal `watch()` subscriptions.
   * No-op when a `signal` was provided in options — cleanup is already
   * wired automatically via `AbortSignal`. Only call this when managing
   * teardown manually (e.g. in tests without a signal).
   */
  cleanup: () => void;
  clear: () => void;
  formValue: ReadonlySignal<string>;
  removeValue: (value: string) => void;
  selectedValue: ReadonlySignal<string | undefined>;
  selectedValues: ReadonlySignal<string[]>;
  selectValue: (value: string) => void;
  setValues: (values: string[]) => void;
  /**
   * Toggles `value` in the selection.
   * - **Multiple mode**: adds if absent, removes if present.
   * - **Single mode**: always selects `value` (acts like `selectValue` — cannot
   *   deselect; use `clear()` to reset a single-select field).
   */
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

  const subs: Subscription[] = [];

  subs.push(watch(options.value, syncFromProp, { immediate: true }));

  if (options.multiple) {
    subs.push(watch(options.multiple, () => syncFromProp(options.value.value)));
  }

  let isCleaned = false;

  const cleanup = (): void => {
    if (isCleaned) return;

    isCleaned = true;

    for (const sub of subs) sub.dispose();
  };

  options.signal?.addEventListener('abort', cleanup, { once: true });

  return {
    ...field,
    cleanup,
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
