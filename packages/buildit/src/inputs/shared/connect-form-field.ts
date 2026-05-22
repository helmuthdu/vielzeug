import type { ReadonlySignal } from '@vielzeug/stateit';

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

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Registers a craftit `defineField` and immediately binds it to a headless
 * handle in one call. Replaces the recurring two-step pattern:
 *
 * ```ts
 * // Before (3 lines per component)
 * const field = defineField<string>({ disabled: tf.disabled, toFormValue: (v) => v, value: tf.value });
 * tf.bindFormField(field);
 *
 * // After (1 line)
 * connectFormField(tf, defineField, tf.value);
 * ```
 *
 * The default `toFormValue` returns `null` for `null`/`undefined` and calls
 * `String(v)` otherwise — override when the value type requires different
 * serialisation (e.g. `File[]`).
 */
export const connectFormField = <T>(
  handle: ConnectableHandle,
  factory: FormFieldFactory,
  value: ReadonlySignal<T>,
  toFormValue: (v: T) => string | null = (v) => (v == null ? null : String(v)),
): void => {
  handle.bindFormField(factory<T>({ disabled: handle.disabled, toFormValue, value }));
};
