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
   * Restores `checked`/`indeterminate` to their native "default" value: whatever `checked`/
   * `indeterminate` currently hold, if the user has never interacted with this control yet, or
   * the value snapshotted at creation, if they have. Two states, not one, because this
   * component reflects the interactive `checked` state back onto the host's `checked` attribute
   * (for `:host([checked])` styling, since shadow-DOM custom elements have no native `:checked`
   * pseudo-class to style against) — so `options.checked` itself changes on every click and
   * can't double as "the default to revert to" post-interaction, the way an uncontrolled
   * `<input>`'s `value` attribute can (see `createTextField`'s `reset()`, which has no
   * "post-interaction" case to handle for exactly that reason). Wire into
   * `useField({ onReset: checkable.reset })`.
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
  // Set the moment the user first interacts — see `reset()`'s doc comment for why this
  // matters: before that point, `options.checked` is still a reliable "current default" to
  // resync from (e.g. an async-loaded value arriving after mount); after it, `options.checked`
  // is contaminated by the click-driven attribute reflection and the frozen snapshot is the
  // only value that still represents "the default" in the native sense.
  let dirty = false;

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
    checked.value = dirty ? initialChecked : Boolean(options.checked.value);
    indeterminate.value = dirty ? initialIndeterminate : Boolean(options.indeterminate?.value);
    dirty = false;
    field.triggerValidation('change');
  };

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (field.disabled.value) return;

    dirty = true;

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
