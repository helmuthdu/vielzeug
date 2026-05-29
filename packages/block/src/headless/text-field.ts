import { syncedSignal } from '@vielzeug/craft';
import { type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import {
  createAssistiveState,
  createField,
  type AssistiveState,
  type FieldBaseOptions,
  type FieldHandle,
  type ValidationTrigger,
} from './field-base';

// Re-export AssistiveState types from field-base for consumers that need them
// directly (e.g. components building custom counter UIs).
export type { AssistiveOptions, AssistiveState, CounterState } from './field-base';
export { createAssistiveState } from './field-base';

// ── Internal helpers ──────────────────────────────────────────────────────────

type TextFieldListenerOptions = {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  /**
   * Called synchronously before value extraction on every input event.
   * Use only for DOM side-effects (e.g. auto-resize measurement) that must
   * run before the reactive value is updated.
   */
  onBeforeInput?: (event: Event) => void;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onInput?: (event: Event, value: string) => void;
  triggerValidation?: (on: Extract<ValidationTrigger, 'blur' | 'change'>) => void;
};

const attachTextFieldListeners = (options: TextFieldListenerOptions): (() => void) => {
  const { element, onBeforeInput, onBlur, onChange, onFocus, onInput, triggerValidation } = options;
  const cleanups: Array<() => void> = [];

  const on = <E extends Event>(type: string, handler: (event: E) => void): void => {
    element.addEventListener(type, handler as EventListener);
    cleanups.push(() => element.removeEventListener(type, handler as EventListener));
  };

  if (onFocus) {
    on('focus', (event: Event) => {
      onFocus(event as FocusEvent);
    });
  }

  if (onInput || onBeforeInput) {
    on('input', (event: Event) => {
      event.stopPropagation();
      onBeforeInput?.(event);
      onInput?.(event, element.value);
    });
  }

  on('change', (event: Event) => {
    event.stopPropagation();
    onChange?.(event, element.value);
    triggerValidation?.('change');
  });

  on('blur', (event: Event) => {
    onBlur?.(event as FocusEvent);
    triggerValidation?.('blur');
  });

  return () => {
    for (const dispose of cleanups) dispose();
  };
};

// ── Text field ────────────────────────────────────────────────────────────────

/** Detach function returned by `wire()`. Call to remove element listeners. */
export type TextFieldDetach = () => void;

export type TextFieldOptions = FieldBaseOptions & {
  maxLength?: ReadonlySignal<number | undefined>;
  /**
   * Called synchronously before value extraction on every input event.
   * Use only for DOM side-effects (e.g. auto-resize measurement) that must
   * run before the reactive value is updated.
   */
  onBeforeInput?: (event: Event) => void;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onInput?: (event: Event, value: string) => void;
  value: ReadonlySignal<string | undefined>;
};

export type TextFieldHandle = FieldHandle & {
  /**
   * Narrows `FieldHandle.assistive` to the richer `AssistiveState` (which
   * extends `ErrorHelperState` with `counter` and `maxLength` fields).
   */
  assistive: ReadonlySignal<AssistiveState>;
  /**
   * Stops the internal watcher that keeps the local value in sync with the
   * external source signal. Call this when the field is destroyed to prevent
   * the watcher from running after its lifetime.
   */
  cleanup: () => void;
  /** Clears the field value and fires synthetic input/change events. */
  clear: (event?: Event) => void;
  /** The local mutable field value (two-way bound to the input element via `wire()`). */
  value: Signal<string>;
  /**
   * Attaches event listeners to the underlying input or textarea element.
   *
   * When `signal` is provided, the listeners are detached automatically when
   * the signal's controller calls `abort()`. Without a signal the returned
   * `TextFieldDetach` must be called manually.
   *
   * Safe to call multiple times — each call attaches a fresh set of listeners
   * and returns a distinct detach function. Calling detach multiple times is
   * a no-op (guarded internally).
   */
  wire: (el: HTMLInputElement | HTMLTextAreaElement, signal?: AbortSignal) => TextFieldDetach;
};

export const createTextField = (options: TextFieldOptions): TextFieldHandle => {
  const [value, stopValueSync] = syncedSignal(options.value, (next) => String(next ?? ''));

  // Use the richer AssistiveState (with counter) and pass it into createField
  // so all aria getters reference the same reactive assistive instance.
  const assistive = createAssistiveState({
    error: options.error,
    helper: options.helper,
    maxLength: options.maxLength,
    value,
  });

  const field = createField(options, assistive);

  const clear = (event?: Event): void => {
    event?.preventDefault?.();
    value.value = '';
    options.onInput?.(event ?? new InputEvent('input', { bubbles: true }), '');
    options.onChange?.(event ?? new Event('change', { bubbles: true }), '');
    field.triggerValidation('change');
  };

  const wire = (element: HTMLInputElement | HTMLTextAreaElement, signal?: AbortSignal): TextFieldDetach => {
    let detached = false;

    const rawDetach = attachTextFieldListeners({
      element,
      onBeforeInput: options.onBeforeInput,
      onBlur: options.onBlur,
      onChange: (event, nextValue) => {
        value.value = nextValue;
        options.onChange?.(event, nextValue);
      },
      onFocus: options.onFocus,
      onInput: (event, nextValue) => {
        value.value = nextValue;
        options.onInput?.(event, nextValue);
      },
      triggerValidation: field.triggerValidation,
    });

    // F4: Guard against double-detach — calling the returned function more than
    // once (e.g. from both a manual call and the signal abort) is a no-op.
    const detach = (): void => {
      if (detached) return;

      detached = true;
      rawDetach();
    };

    signal?.addEventListener('abort', detach, { once: true });

    return detach;
  };

  return { ...field, assistive, cleanup: stopValueSync, clear, value, wire };
};
