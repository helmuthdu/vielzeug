import type { TextFieldHandle, TextFieldOptions } from '../../headless';
import { createTextField, toAbortSignal } from '../../headless';

import { connectFormField } from './connect-form-field';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormFieldFactory = Parameters<typeof connectFormField>[1];

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Creates a text field, wires form integration, and returns the handle together
 * with an `AbortSignal` tied to the component lifecycle.
 *
 * Combines the recurring three-step setup pattern:
 * 1. `const signal = toAbortSignal(onCleanup)`
 * 2. `const tf = createTextField(options)`
 * 3. `connectFormField(tf, defineField, tf.value, (v) => v)`
 *
 * into a single call. The returned `signal` should be passed to `tf.wire()` so
 * element listeners are detached automatically on teardown.
 *
 * @example
 * ```ts
 * const { signal, wire, fieldId, assistive, label, aria } = useTextField(
 *   { value: props.value, error: props.error, ... },
 *   defineField,
 *   onCleanup,
 * );
 *
 * onElement(inputRef, (el) => wire(el, signal));
 * ```
 */
export const useTextField = (
  options: TextFieldOptions,
  factory: FormFieldFactory,
  onCleanup: (fn: () => void) => void,
): TextFieldHandle & { signal: AbortSignal } => {
  const signal = toAbortSignal(onCleanup);
  const tf = createTextField(options);

  connectFormField(tf, factory, tf.value, (v) => v);

  return { ...tf, signal };
};
