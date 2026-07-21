import { computed, type Readable, type Signal, signal } from '@vielzeug/ripple';

import { createDirtyTracker, createField, type ControlValidationMode, type FieldHandle } from './field-base';
import { createInteraction } from './keyboard';
import { syncedSignal } from './signals';

// ── Checkable control ─────────────────────────────────────────────────────────

export type CheckableChangePayload = {
  checked: boolean;
  originalEvent?: Event;
  value: string;
};

export type CheckableOptions = {
  checked: Readable<boolean | undefined>;
  clearIndeterminateFirst?: boolean;
  disabled?: Readable<boolean | undefined>;
  error?: Readable<string | undefined>;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  helper?: Readable<string | undefined>;
  indeterminate?: Readable<boolean | undefined>;
  onToggle?: (payload: CheckableChangePayload) => void;
  prefix?: string;
  /** Marks an unchecked control invalid — feeds `validity`/`validationMessage` (see below). */
  required?: Readable<boolean | undefined>;
  /** Message for the unchecked+required case. Defaults to `'This field is required.'`. */
  requiredMessage?: Readable<string | undefined>;
  /** `AbortSignal` from the component lifecycle. All reactive subscriptions are torn down on abort. */
  signal: AbortSignal;
  validateOn?: Readable<ControlValidationMode>;
  value: Readable<string | undefined>;
};

export type CheckableHandle = FieldHandle & {
  /** The form submission value: null when unchecked/indeterminate, the value string when checked. */
  checkableFormValue: Readable<string | null>;
  checked: Signal<boolean>;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  indeterminate: Signal<boolean>;
  /**
   * Restores `checked`/`indeterminate` to their native "default" value. See `DirtyTracker`
   * for the two-state rationale. Wire into `useField({ onReset: checkable.reset })`.
   */
  reset: () => void;
  toggle: (event: Event) => void;
  /** Reactive validation message paired with `validity`. Empty string when valid. */
  validationMessage: Readable<string>;
  /**
   * Reactive `ValidityStateFlags` — `{ valueMissing: true }` while `required` and unchecked
   * (indeterminate counts as unchecked), `null` (valid) otherwise. Pass straight to
   * `useField({ validity: checkable.validity })`.
   */
  validity: Readable<ValidityStateFlags | null>;
};

export const createCheckable = (options: CheckableOptions): CheckableHandle => {
  const checked = syncedSignal(options.checked, options.signal, Boolean);
  const indeterminate = options.indeterminate
    ? syncedSignal(options.indeterminate, options.signal, Boolean)
    : signal(false);
  const initialChecked = checked.value;
  const initialIndeterminate = indeterminate.value;
  const dirtyTracker = createDirtyTracker();

  const checkableFormValue = computed<string | null>(() =>
    indeterminate.value ? null : checked.value ? (options.value.value ?? '') : null,
  );

  const field = createField(options);

  const validity = computed<ValidityStateFlags | null>(() =>
    options.required?.value && (!checked.value || indeterminate.value) ? { valueMissing: true } : null,
  );
  const validationMessage = computed(() =>
    validity.value ? options.requiredMessage?.value || 'This field is required.' : '',
  );

  const reset = (): void => {
    checked.value = dirtyTracker.isDirty ? initialChecked : Boolean(options.checked.value);
    indeterminate.value = dirtyTracker.isDirty ? initialIndeterminate : Boolean(options.indeterminate?.value);
    dirtyTracker.clear();
    field.triggerValidation('change');
  };

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (field.disabled.value) return;

    dirtyTracker.markDirty();

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

  const interaction = createInteraction({
    disabled: field.disabled,
    onPress: (event) => toggle(event),
  });

  return {
    ...field,
    checkableFormValue,
    checked,
    handleClick: interaction.handleClick,
    handleKeydown: interaction.handleKeydown,
    indeterminate,
    reset,
    toggle,
    validationMessage,
    validity,
  };
};
