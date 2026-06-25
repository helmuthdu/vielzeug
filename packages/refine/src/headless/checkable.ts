import { computed, type Readable, type Signal, signal } from '@vielzeug/ripple';

import { createField, type ControlValidationMode, type FieldHandle } from './field-base';
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
  /**
   * Returns the underlying form field object used for validation triggering.
   * Called lazily — safe to return `null` before the first render.
   */
  getFormField?: () => { reportValidity(): void } | null;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  helper?: Readable<string | undefined>;
  indeterminate?: Readable<boolean | undefined>;
  onToggle?: (payload: CheckableChangePayload) => void;
  prefix?: string;
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
  toggle: (event: Event) => void;
};

export const createCheckable = (options: CheckableOptions): CheckableHandle => {
  const checked = syncedSignal(options.checked, options.signal, Boolean);
  const indeterminate = options.indeterminate
    ? syncedSignal(options.indeterminate, options.signal, Boolean)
    : signal(false);

  const checkableFormValue = computed<string | null>(() =>
    indeterminate.value ? null : checked.value ? (options.value.value ?? '') : null,
  );

  const field = createField(options);

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (field.disabled.value) return;

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
    disabled: () => field.disabled.value,
    onPress: (event) => toggle(event),
  });

  return {
    ...field,
    checkableFormValue,
    checked,
    handleClick: interaction.handleClick,
    handleKeydown: interaction.handleKeydown,
    indeterminate,
    toggle,
  };
};
