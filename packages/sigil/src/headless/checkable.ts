import { assert } from '@vielzeug/arsenal';
import { createStableId } from '@vielzeug/craft';
import { computed, effect, type ReadonlySignal, type Signal, signal, untrack, watch } from '@vielzeug/ripple';

import { createField, type ErrorHelperState, type FieldOptions, type ValidationTrigger } from './field-base';
import { createInteraction } from './keyboard';

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
  /** Used by checkable components to bind the native form field. */
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
  assert(!!options.host, '[sigil] createCheckable: host element is required');

  // Inline synced signal: local writable signal kept in sync with external source.
  const checked = signal<boolean>(untrack(() => Boolean(options.checked.value)));
  const checkedSub = watch(options.checked, (v) => {
    checked.value = Boolean(v);
  });

  let indeterminate: Signal<boolean>;
  let indeterminateSub: { dispose(): void } | null = null;

  if (options.indeterminate) {
    indeterminate = signal<boolean>(untrack(() => Boolean(options.indeterminate!.value)));
    indeterminateSub = watch(options.indeterminate, (v) => {
      indeterminate.value = Boolean(v);
    });
  } else {
    indeterminate = signal(false);
  }

  const checkableFormValue = computed<string | null>(() =>
    indeterminate.value ? null : checked.value ? (options.value.value ?? '') : null,
  );

  const { assistive, assistiveId, bindFormField, disabled, fieldId, triggerValidation } = createField(options);

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

  // Set the ARIA role once — it is static for a given checkable instance.
  options.host.setAttribute('role', options.role);

  // Unified reactive ARIA sync + helper ID stamping in a single effect.
  // Re-runs whenever any tracked signal changes. _labelEl and _helperEl are
  // reactive so their effects fire automatically when the elements mount.
  const ariaEffect = effect(() => {
    const host = options.host;

    // aria-checked
    const checkedVal = options.role === 'checkbox' && indeterminate.value ? 'mixed' : checked.value ? 'true' : 'false';

    host.setAttribute('aria-checked', checkedVal);

    // aria-describedby
    const hasAssistive = assistive.value.errorText || assistive.value.helperText;

    if (hasAssistive) {
      host.setAttribute('aria-describedby', assistiveId);
    } else {
      host.removeAttribute('aria-describedby');
    }

    // aria-disabled
    if (disabled.value) {
      host.setAttribute('aria-disabled', 'true');
    } else {
      host.removeAttribute('aria-disabled');
    }

    // aria-invalid
    if (assistive.value.errorText) {
      host.setAttribute('aria-invalid', 'true');
    } else {
      host.removeAttribute('aria-invalid');
    }

    // aria-labelledby: stamp the label element's stable ID
    const labelElRef = _labelEl.value;

    if (labelElRef) {
      if (!labelElRef.id) labelElRef.id = labelId;

      host.setAttribute('aria-labelledby', labelElRef.id);
    } else {
      host.removeAttribute('aria-labelledby');
    }

    // Stamp the helper element's stable ID so aria-describedby resolves
    // even when assistive text is absent (pure ID reservation).
    const helperElRef = _helperEl.value;

    if (helperElRef && !helperElRef.id) helperElRef.id = assistiveId;
  });

  const cleanup = (): void => {
    checkedSub.dispose();
    indeterminateSub?.dispose();
    ariaEffect.dispose();
  };

  options.signal?.addEventListener('abort', cleanup, { once: true });

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
    cleanup,
    disabled,
    fieldId,
    handleClick: interaction.handleClick,
    handleKeydown: interaction.handleKeydown,
    indeterminate,
    labelId,
    setHelperEl,
    setLabelEl,
    toggle,
    triggerValidation,
  };
};
