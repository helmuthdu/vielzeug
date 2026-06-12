import { type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import { type CounterState, createCounterState, createField, type FieldHandle, type FieldOptions } from './field-base';
import { syncedSignal } from './utils';

// Re-export types from field-base for consumers that need them directly.
export type { CounterOptions, CounterState, ErrorHelperOptions, ErrorHelperState } from './field-base';
export { createCounterState, createErrorHelperState } from './field-base';

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
  /** `AbortSignal` from the component lifecycle. The internal value-sync watcher is disposed on abort. */
  signal: AbortSignal;
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
  const value = syncedSignal(options.value, options.signal, (v) => String(v ?? ''));

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
    const cleanups: Array<() => void> = [];
    const on = (type: string, handler: EventListener): void => {
      element.addEventListener(type, handler);
      cleanups.push(() => element.removeEventListener(type, handler));
    };

    if (options.onFocus) {
      on('focus', (e) => options.onFocus!(e as FocusEvent));
    }

    if (options.onInput || options.onBeforeInput) {
      on('input', (e) => {
        e.stopPropagation();
        options.onBeforeInput?.(e);
        value.value = element.value;
        options.onInput?.(e, element.value);
      });
    }

    on('change', (e) => {
      e.stopPropagation();
      value.value = element.value;
      options.onChange?.(e, element.value);
      field.triggerValidation('change');
    });

    on('blur', (e) => {
      options.onBlur?.(e as FocusEvent);
      field.triggerValidation('blur');
    });

    let detached = false;
    const detach = (): void => {
      if (detached) return;

      detached = true;
      for (const dispose of cleanups) dispose();
    };

    signal?.addEventListener('abort', detach, { once: true });

    return detach;
  };

  return { ...field, clear, counter, value, wire };
};
