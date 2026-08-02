import { computed, type Readable, type Signal } from '@vielzeug/ripple';

import { type CounterState, createCounterState, createField, type FieldHandle, type FieldOptions } from './field-base';
import { syncedSignal } from './signals';

// ── Text field ────────────────────────────────────────────────────────────────

/** Detach function returned by `wire()`. Call to remove element listeners. */
export type TextFieldDetach = () => void;

export type TextFieldOptions = FieldOptions & {
  maxLength?: Readable<number | undefined>;
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
   * Bars the field from constraint validation while true — matches the native HTML rule that a
   * `readonly` field is never a candidate for constraint validation (a `readonly required`
   * field is always valid, per spec), so `validity`/`validationMessage` don't feed a false
   * `valueMissing` into `useField()` just because a read-only field happens to be blank.
   */
  readonly?: Readable<boolean | undefined>;
  /** Marks a blank value invalid — feeds `validity`/`validationMessage` (see below). */
  required?: Readable<boolean | undefined>;
  /** Message for the blank+required case. Defaults to `'This field is required.'`. */
  requiredMessage?: Readable<string | undefined>;
  /** `AbortSignal` from the component lifecycle. The internal value-sync watcher is disposed on abort. */
  signal: AbortSignal;
  value: Readable<string | undefined>;
};

export type TextFieldHandle = FieldHandle & {
  /**
   * Registers the real form field handle (the return value of `useField()`) so that
   * `triggerValidation()` — called internally on blur/change — can call its
   * `reportValidity()`. `useField()` itself needs `value` (below) to exist first, so this
   * is a two-step wiring rather than a constructor option:
   *
   * ```ts
   * const tf = createTextField({ value: props.value, ... });
   * const formField = useField({ value: tf.value, ... });
   * tf.attachFormField(formField);
   * ```
   */
  attachFormField: (formField: { reportValidity(): void }) => void;
  /** Clears the field value and fires synthetic input/change events. */
  clear: (event?: Event) => void;
  /**
   * Reactive counter state. Non-null when `maxLength` was provided; `null` otherwise.
   * Components should only render a counter element when this is non-null.
   */
  counter: Readable<CounterState> | null;
  /**
   * Restores the value to whatever the `value` option currently holds (native form
   * `reset()` semantics: a `<input>` reverts to its *current* `value` content attribute,
   * not a frozen snapshot from element creation — so setting the attribute programmatically
   * after mount changes what a later reset reverts to). Wire into `useField({ onReset: tf.reset })`.
   */
  reset: () => void;
  /** Reactive validation message paired with `validity`. Empty string when valid. */
  validationMessage: Readable<string>;
  /**
   * Reactive `ValidityStateFlags` — `{ valueMissing: true }` while `required` and blank,
   * `null` (valid) otherwise. Pass straight to `useField({ validity: tf.validity })`.
   */
  validity: Readable<ValidityStateFlags | null>;
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

const isBlank = (value: string): boolean => value.trim() === '';
const toFieldValue = (v: string | undefined): string => String(v ?? '');

export const createTextField = (options: TextFieldOptions): TextFieldHandle => {
  const value = syncedSignal(options.value, options.signal, toFieldValue);

  const field = createField(options);
  const counter = options.maxLength ? createCounterState({ maxLength: options.maxLength, value }) : null;

  const validity = computed<ValidityStateFlags | null>(() =>
    !options.readonly?.value && options.required?.value && isBlank(value.value) ? { valueMissing: true } : null,
  );
  const validationMessage = computed(() =>
    validity.value ? options.requiredMessage?.value || 'This field is required.' : '',
  );

  const reset = (): void => {
    value.value = toFieldValue(options.value.value);
    field.triggerValidation('change');
  };

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

    on('input', (e) => {
      e.stopPropagation();
      options.onBeforeInput?.(e);
      value.value = element.value;
      options.onInput?.(e, element.value);
    });

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

  return { ...field, clear, counter, reset, validationMessage, validity, value, wire };
};
