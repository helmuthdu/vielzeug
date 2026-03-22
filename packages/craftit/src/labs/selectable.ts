import { type ReadonlySignal, type Signal, signal } from '@vielzeug/stateit';

/**
 * Change event payload emitted by checkable controls.
 */
export type CheckableChangePayload = {
  checked: boolean;
  fieldValue: string;
  originalEvent?: Event;
  value: boolean;
};

/**
 * Configuration for `createCheckableControl()`.
 */
export type CheckableControlConfig = {
  /** Writable checked signal — mutated directly by toggle() so all reactive bindings stay in sync */
  checked: Signal<boolean>;
  /** When `true`, the first click clears indeterminate instead of toggling checked */
  clearIndeterminateFirst?: boolean;
  /** Disabled signal (usually from props) */
  disabled: ReadonlySignal<boolean | undefined>;
  /** Optional: checkbox group context for syncing multiple checkboxes */
  group?: { toggle(value: string, originalEvent?: Event): void } | undefined;
  /** Writable indeterminate signal — managed by the caller, cleared by toggle() */
  indeterminate?: Signal<boolean>;
  /** Optional: callback when toggle occurs (for form validation / event emission) */
  onToggle?: (e: Event) => void;
  /** Value signal (usually from props) */
  value: ReadonlySignal<string | undefined>;
};

/**
 * Handle returned from `createCheckableControl()`.
 */
export type CheckableControlHandle = {
  /** Create a standard change payload from an event */
  changePayload: (e: Event) => CheckableChangePayload;
  /** Current checked state — the same signal passed in via config.checked */
  checked: ReadonlySignal<boolean>;
  /** Current indeterminate state signal */
  indeterminate: ReadonlySignal<boolean>;
  /** Toggle function (respecting disabled state and indeterminate rules) */
  toggle: (e: Event) => void;
};

/**
 * Manages checked/indeterminate state logic for checkable form controls (checkbox, radio, switch).
 *
 * Encapsulates:
 * - Controlled state management (operates directly on the caller's signals — no internal copy)
 * - Indeterminate-first clearing behavior
 * - Disabled guard
 * - Group integration (for checkbox-group context)
 * - Standard change payload creation
 *
 * @example
 * const checkedSignal = signal(false);
 * const control = createCheckableControl({
 *   checked: checkedSignal,
 *   disabled: props.disabled,
 *   value: props.value,
 *   clearIndeterminateFirst: true,
 * });
 *
 * reflect({
 *   checked: () => control.checked.value,
 *   onClick: (e) => control.toggle(e),
 * });
 */
export function createCheckableControl(config: CheckableControlConfig): CheckableControlHandle {
  const indeterminate = config.indeterminate ?? signal<boolean>(false);

  const toggle = (e: Event) => {
    if (config.disabled.value ?? false) return;

    if (config.group) {
      indeterminate.value = false;
      config.group.toggle(config.value.value ?? '', e);
      config.onToggle?.(e);

      return;
    }

    if (config.clearIndeterminateFirst && indeterminate.value) {
      indeterminate.value = false;
    } else {
      config.checked.value = !config.checked.value;
      indeterminate.value = false;
    }

    config.onToggle?.(e);
  };

  const changePayload = (e: Event): CheckableChangePayload => ({
    checked: config.checked.value,
    fieldValue: config.value.value ?? '',
    originalEvent: e,
    value: config.checked.value,
  });

  return {
    changePayload,
    checked: config.checked,
    indeterminate,
    toggle,
  };
}
