import { computed, type ReadonlySignal, type Signal, signal } from '@vielzeug/ripple';

import { createField, type ErrorHelperState, type FieldOptions, type ValidationTrigger } from './field-base';
import { createInteraction } from './keyboard';
import { syncedSignal } from './utils';

// ── Checkable control ─────────────────────────────────────────────────────────

export type CheckableChangePayload = {
  checked: boolean;
  originalEvent?: Event;
  value: string;
};

export type CheckableOptions = Pick<FieldOptions, 'disabled' | 'error' | 'helper' | 'prefix' | 'validateOn'> & {
  checked: ReadonlySignal<boolean | undefined>;
  clearIndeterminateFirst?: boolean;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  indeterminate?: ReadonlySignal<boolean | undefined>;
  onToggle?: (payload: CheckableChangePayload) => void;
  /** `AbortSignal` from the component lifecycle. All reactive subscriptions are torn down on abort. */
  signal: AbortSignal;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableHandle = {
  assistive: ReadonlySignal<ErrorHelperState>;
  /** The stable `id` for the assistive-text region (used for `aria-describedby`). */
  assistiveId: string;
  bindFormField: (field: { reportValidity(): void }) => void;
  /** The form submission value: null when unchecked/indeterminate, the value string when checked. */
  checkableFormValue: ReadonlySignal<string | null>;
  checked: Signal<boolean>;
  disabled: ReadonlySignal<boolean>;
  fieldId: string;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  indeterminate: Signal<boolean>;
  /** Stable `id` for the label element. Stamp this on your `<label>` element's `id`. */
  labelId: string;
  toggle: (event: Event) => void;
  triggerValidation: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
};

export const createCheckable = (options: CheckableOptions): CheckableHandle => {
  const checked = syncedSignal(options.checked, options.signal, Boolean);
  const indeterminate = options.indeterminate
    ? syncedSignal(options.indeterminate, options.signal, Boolean)
    : signal(false);

  const checkableFormValue = computed<string | null>(() =>
    indeterminate.value ? null : checked.value ? (options.value.value ?? '') : null,
  );

  const { assistive, assistiveId, bindFormField, disabled, fieldId, labelId, triggerValidation } = createField(options);

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (disabled.value) return;

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
    disabled: () => disabled.value,
    onPress: (event) => toggle(event),
  });

  return {
    assistive,
    assistiveId,
    bindFormField,
    checkableFormValue,
    checked,
    disabled,
    fieldId,
    handleClick: interaction.handleClick,
    handleKeydown: interaction.handleKeydown,
    indeterminate,
    labelId,
    toggle,
    triggerValidation,
  };
};
