import { type ReadonlySignal, type Signal, signal, untrack, watch } from '@vielzeug/ripple';

import {
  type CounterState,
  createCounterState,
  createField,
  type ErrorHelperState,
  type FieldHandle,
  type FieldOptions,
  type ValidationTrigger,
} from './field-base';

// Re-export types from field-base for consumers that need them directly.
export type { CounterOptions, CounterState, ErrorHelperOptions, ErrorHelperState } from './field-base';
export { createCounterState, createErrorHelperState } from './field-base';

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

export type TextFieldOptions = FieldOptions & {
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
  /**
   * Optional `AbortSignal` tied to the component lifecycle.
   * When provided, the internal value-sync watcher is disposed automatically
   * on abort — no need to call `cleanup()` manually.
   *
   * Obtain via `componentSignal(onCleanup)` inside a craft `setup()` function.
   */
  signal?: AbortSignal;
  value: ReadonlySignal<string | undefined>;
};

export type TextFieldHandle = FieldHandle & {
  /** Clears the field value and fires synthetic input/change events. */
  clear: (event?: Event) => void;
  /**
   * Reactive counter state. Non-null when `maxLength` was provided; `null` otherwise.
   * Components should only render a counter element when this is non-null.
   */
  counter: ReadonlySignal<CounterState> | null;
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
  // Inline synced signal: local writable value kept in sync with external prop.
  const value = signal<string>(untrack(() => String(options.value.value ?? '')));
  const valueSub = watch(options.value, (next) => {
    value.value = String(next ?? '');
  });

  // Wire cleanup to component lifecycle signal if provided.
  options.signal?.addEventListener('abort', () => valueSub.dispose(), { once: true });

  const field = createField(options);
  const counter = options.maxLength ? createCounterState({ maxLength: options.maxLength, value }) : null;

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

  return { ...field, clear, counter, value, wire };
};
