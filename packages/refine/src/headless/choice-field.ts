import { computed, type Readable, signal, watch } from '@vielzeug/ripple';

import { createField, type FieldHandle, type FieldOptions } from './field-base';

// ── Choice change event payload ──────────────────────────────────────────────────────────────

export type ChoiceChangeDetail = {
  labels: string[];
  originalEvent?: Event;
  values: string[];
};

// ── Choice field ──────────────────────────────────────────────────────────────────────

export type ChoiceFieldOptions = FieldOptions & {
  multiple?: Readable<boolean | undefined>;
  /** Marks an empty selection invalid — feeds `validity`/`validationMessage` (see below). */
  required?: Readable<boolean | undefined>;
  /** Message for the empty-selection+required case. Defaults to `'Please make a selection.'`. */
  requiredMessage?: Readable<string | undefined>;
  /** `AbortSignal` from the component lifecycle. All internal subscriptions are disposed on abort. */
  signal: AbortSignal;
  /**
   * Current selection value(s). Accepts a comma-separated string
   * (legacy/single-select form serialisation) or a `string[]` array.
   * The field normalises both formats internally via `parseChoiceValues`.
   */
  value: Readable<string | string[] | undefined>;
};

export type ChoiceFieldHandle = FieldHandle & {
  clear: () => void;
  formValue: Readable<string>;
  removeValue: (value: string) => void;
  /**
   * Restores the selection to its native "default": whatever `value` currently holds, if the
   * user has never changed the selection yet, or the value snapshotted at creation, if they
   * have. Two states, not one — see `createCheckable`'s `reset()` for the identical situation
   * with `checked`, and why: `ore-radio-group`/`ore-checkbox-group` reflect the current
   * selection back onto the host's `value`/`values` attribute for `:host([value])` styling
   * (there's no native form control here to carry it), so `options.value` changes on every
   * selection and can't double as "the default to revert to" post-interaction.
   */
  reset: () => void;
  selectedValue: Readable<string | undefined>;
  selectedValues: Readable<string[]>;
  selectValue: (value: string) => void;
  setValues: (values: string[]) => void;
  /**
   * Toggles `value` in the selection.
   * - **Multiple mode**: adds if absent, removes if present.
   * - **Single mode**: always selects `value` (acts like `selectValue` — cannot
   *   deselect; use `clear()` to reset a single-select field).
   */
  toggleValue: (value: string) => void;
  /** Reactive validation message paired with `validity`. Empty string when valid. */
  validationMessage: Readable<string>;
  /**
   * Reactive `ValidityStateFlags` — `{ valueMissing: true }` while `required` and no option is
   * selected, `null` (valid) otherwise. Pass straight to `useField({ validity: choice.validity })`.
   */
  validity: Readable<ValidityStateFlags | null>;
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

  // Set the moment the user first changes the selection — see `reset()`'s doc comment for why
  // this matters: before that point, `options.value` is still a reliable "current default" to
  // resync from (e.g. an async-loaded value arriving after mount); after it, `options.value` is
  // contaminated by the selection-driven attribute reflection (on the components where that
  // applies) and the frozen snapshot is the only value that still represents "the default".
  let dirty = false;

  // The actual state setter, shared by every mutation path. Deliberately *not* where `dirty`
  // gets set — `syncFromProp` (below) calls this directly to stay exempt from it, since mirroring
  // an external prop change is never "the user changed the selection".
  const applyValues = (values: string[]): void => {
    selectedValues.value = normalizeValues(values);
  };

  const setValues = (values: string[]): void => {
    dirty = true;
    applyValues(values);
  };
  const clear = (): void => setValues([]);
  const removeValue = (value: string): void => {
    dirty = true;
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
      if (selectedValues.value.includes(value)) removeValue(value);
      else selectValue(value);
    } else {
      selectValue(value);
    }
  };

  const syncFromProp = (nextValue: string | string[] | undefined): void => {
    applyValues(parseChoiceValues(nextValue));
  };

  const field = createField(options);

  const validity = computed<ValidityStateFlags | null>(() =>
    options.required?.value && selectedValues.value.length === 0 ? { valueMissing: true } : null,
  );
  const validationMessage = computed(() =>
    validity.value ? options.requiredMessage?.value || 'Please make a selection.' : '',
  );

  const valueSub = watch(options.value, syncFromProp, { immediate: true });

  options.signal.addEventListener('abort', () => valueSub.dispose(), { once: true });

  if (options.multiple) {
    const multipleSub = watch(options.multiple, () => syncFromProp(options.value.value));

    options.signal.addEventListener('abort', () => multipleSub.dispose(), { once: true });
  }

  const initialValues = selectedValues.value;
  const reset = (): void => {
    applyValues(dirty ? initialValues : parseChoiceValues(options.value.value));
    dirty = false;
    field.triggerValidation('change');
  };

  return {
    ...field,
    clear,
    formValue,
    removeValue,
    reset,
    selectedValue: computed(() => selectedValues.value[0]),
    selectedValues,
    selectValue,
    setValues,
    toggleValue,
    validationMessage,
    validity,
  };
};
