import type { ReadonlySignal } from '@vielzeug/ripple';

import type { TextFieldHandle, TextFieldOptions } from '../../headless';

import { componentSignal, createTextField } from '../../headless';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormFieldFactory = <T>(opts: {
  disabled: ReadonlySignal<boolean>;
  toFormValue: (v: T) => string | null;
  value: ReadonlySignal<T>;
}) => { reportValidity(): void };

// ── useTextField ──────────────────────────────────────────────────────────────

/**
 * Creates a text field, wires form integration, and returns the handle together
 * with an `AbortSignal` tied to the component lifecycle.
 *
 * The component-lifecycle `AbortSignal` is passed directly to `createTextField`
 * so the internal value-sync watcher is disposed automatically — no manual
 * `cleanup()` required.
 *
 * @example
 * ```ts
 * const { abortSignal, wire, fieldId, assistive, label, aria } = useTextField(
 *   { value: props.value, error: props.error, ... },
 *   defineField,
 *   onCleanup,
 * );
 *
 * onElement(inputRef, (el) => wire(el, abortSignal));
 * ```
 */
export const useTextField = (
  options: TextFieldOptions,
  factory: FormFieldFactory,
  onCleanup: (fn: () => void) => void,
): TextFieldHandle & { abortSignal: AbortSignal } => {
  const abortSignal = componentSignal(onCleanup);
  const tf = createTextField({ ...options, signal: abortSignal });

  tf.bindFormField(factory<string>({ disabled: tf.disabled, toFormValue: (v) => v, value: tf.value }));

  return { ...tf, abortSignal };
};
