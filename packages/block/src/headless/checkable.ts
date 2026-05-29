import { syncedSignal } from '@vielzeug/craft';
import { type ReadonlySignal, type Signal, computed, signal } from '@vielzeug/ripple';

import type { ValidationTrigger } from './field-base';

import { createA11yHost } from './a11y-host';
import { devAssert, HeadlessError } from './dev';
import { createErrorHelperState, createFieldCore, type ErrorHelperState, type FieldCoreOptions } from './field-base';
import { createStableId } from './id';
import { createInteraction } from './keyboard';

// ── Checkable control ─────────────────────────────────────────────────────────

export type CheckableChangePayload = {
  checked: boolean;
  originalEvent?: Event;
  value: string;
};

export type CheckableOptions = FieldCoreOptions & {
  checked: ReadonlySignal<boolean | undefined>;
  clearIndeterminateFirst?: boolean;
  error?: ReadonlySignal<string | undefined>;
  group?: { toggle: (value: string, originalEvent?: Event) => void };
  helper?: ReadonlySignal<string | undefined>;
  host: Element;
  indeterminate?: ReadonlySignal<boolean | undefined>;
  onToggle?: (payload: CheckableChangePayload) => void;
  role: 'checkbox' | 'radio' | 'switch';
  /**
   * `AbortSignal` from the component lifecycle. When provided, all reactive
   * effects are torn down automatically on `abort()` and `cleanup()` becomes
   * a no-op.
   *
   * Obtain via `toAbortSignal(onCleanup)` inside a craft `setup()` function.
   */
  signal?: AbortSignal;
  value: ReadonlySignal<string | undefined>;
};

export type CheckableHandle = {
  assistive: ReadonlySignal<ErrorHelperState>;
  /** The stable `id` for the assistive-text region (used for `aria-describedby`). */
  assistiveId: string;
  bindFormField: (field: { reportValidity(): void }) => void;
  /** @internal Used by `connectFormField` to bind the native form field. */
  /** The form submission value: null when unchecked/indeterminate, the value string when checked. */
  checkableFormValue: ReadonlySignal<string | null>;
  checked: Signal<boolean>;
  /**
   * Manual cleanup. No-op when a `signal` was provided in options — cleanup
   * is already wired automatically via `AbortSignal`. Only call this when
   * managing teardown manually (e.g. in tests without a signal).
   */
  cleanup: () => void;
  disabled: ReadonlySignal<boolean>;
  fieldId: string;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  indeterminate: Signal<boolean>;
  labelId: string;
  /**
   * Call with the helper-text element reference when it is mounted.
   * Craft usage: `ref=${(el) => checkable.setHelperEl(el)}`
   */
  setHelperEl: (el: HTMLElement | null) => void;
  /**
   * Call with the label element reference when it is mounted.
   * Craft usage: `ref=${(el) => checkable.setLabelEl(el)}`
   */
  setLabelEl: (el: HTMLElement | null) => void;
  toggle: (event: Event) => void;
  triggerValidation: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
  /** @internal Used by form context to trigger validation on submit. */
};

export const createCheckable = (options: CheckableOptions): CheckableHandle => {
  devAssert(!!options.host, HeadlessError.MISSING_HOST, 'createCheckable: host element is required');

  const [checked, stopCheckedSync] = syncedSignal(options.checked, (v) => Boolean(v));
  const [indeterminate, stopIndeterminateSync] = options.indeterminate
    ? syncedSignal(options.indeterminate, (v) => Boolean(v))
    : [signal(false), () => {}];

  const checkableFormValue = computed<string | null>(() =>
    indeterminate.value ? null : checked.value ? (options.value.value ?? '') : null,
  );

  const assistive = createErrorHelperState({ error: options.error, helper: options.helper });

  const core = createFieldCore(options);

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (core.disabled.value) return;

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

  // Internal signals for reactive element references. Exposed as setter methods
  // on the public handle to decouple the headless primitive from craft's
  // specific ref-setting mechanism (any renderer can call setLabelEl/setHelperEl).
  const _labelEl = signal<HTMLElement | null>(null);
  const _helperEl = signal<HTMLElement | null>(null);

  const setLabelEl = (el: HTMLElement | null): void => {
    _labelEl.value = el;
  };

  const setHelperEl = (el: HTMLElement | null): void => {
    _helperEl.value = el;
  };

  const labelId = createStableId('label');
  const assistiveId = core.assistiveId;

  // Set the ARIA role once — it is static for a given checkable instance.
  options.host.setAttribute('role', options.role);

  // Unified reactive ARIA sync + helper ID stamping via createA11yHost.
  // Re-runs whenever any tracked signal changes. _labelEl and _helperEl are
  // reactive so their effects fire automatically when the elements mount.
  const { stop: stopAriaEffect } = createA11yHost(options.host, {
    aria: {
      'aria-checked': () =>
        options.role === 'checkbox' && indeterminate.value ? 'mixed' : checked.value ? 'true' : 'false',
      'aria-describedby': () => (assistive.value.errorText || assistive.value.helperText ? assistiveId : undefined),
      'aria-disabled': () => (core.disabled.value ? 'true' : undefined),
      'aria-invalid': () => (assistive.value.errorText ? 'true' : undefined),
      'aria-labelledby': () => {
        const el = _labelEl.value;

        if (el && !el.id) el.id = labelId;

        return el?.id ?? undefined;
      },
    },
    run: () => {
      // Stamp the helper element's stable ID so aria-describedby resolves
      // even when assistive text is absent (pure ID reservation).
      const el = _helperEl.value;

      if (el && !el.id) el.id = assistiveId;
    },
    signal: options.signal,
  });

  const cleanup = (): void => {
    stopCheckedSync();
    stopIndeterminateSync();
    stopAriaEffect();
  };

  options.signal?.addEventListener('abort', cleanup, { once: true });

  const interaction = createInteraction({
    disabled: () => core.disabled.value,
    onPress: (event) => toggle(event),
  });

  return {
    ...core,
    assistive,
    assistiveId,
    checkableFormValue,
    checked,
    cleanup,
    handleClick: interaction.handleClick,
    handleKeydown: interaction.handleKeydown,
    indeterminate,
    labelId,
    setHelperEl,
    setLabelEl,
    toggle,
  };
};
