import type { ReadonlySignal } from '@vielzeug/ripple';

import type { TextFieldHandle, TextFieldOptions } from '../../headless';

import { createTextField, toAbortSignal } from '../../headless';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormFieldFactory = <T>(opts: {
  disabled: ReadonlySignal<boolean>;
  toFormValue: (v: T) => string | null;
  value: ReadonlySignal<T>;
}) => { reportValidity(): void };

type ConnectableHandle = {
  bindFormField(field: { reportValidity(): void }): void;
  disabled: ReadonlySignal<boolean>;
};

// ── connectFormField ──────────────────────────────────────────────────────────

/**
 * Registers a craft `defineField` and immediately binds it to a headless
 * handle in one call. Replaces the recurring two-step pattern:
 *
 * ```ts
 * const field = defineField<string>({ disabled: tf.disabled, toFormValue: (v) => v, value: tf.value });
 * tf.bindFormField(field);
 * ```
 */
export const connectFormField = <T>(
  handle: ConnectableHandle,
  factory: FormFieldFactory,
  value: ReadonlySignal<T>,
  toFormValue: (v: T) => string | null = (v) => (v == null ? null : String(v)),
): void => {
  handle.bindFormField(factory<T>({ disabled: handle.disabled, toFormValue, value }));
};

// ── useTextField ──────────────────────────────────────────────────────────────

/**
 * Creates a text field, wires form integration, and returns the handle together
 * with an `AbortSignal` tied to the component lifecycle.
 *
 * Combines the recurring three-step setup pattern:
 * 1. `const abortSignal = toAbortSignal(onCleanup)`
 * 2. `const tf = createTextField(options)`
 * 3. `connectFormField(tf, defineField, tf.value, (v) => v)`
 *
 * into a single call. The returned `abortSignal` should be passed to `tf.wire()` so
 * element listeners are detached automatically on teardown.
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
  const abortSignal = toAbortSignal(onCleanup);
  const tf = createTextField(options);

  connectFormField(tf, factory, tf.value, (v) => v);

  return { ...tf, abortSignal };
};
