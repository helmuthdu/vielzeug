import type { FieldValidator, SafeParseSchema } from '../types';

/**
 * Chains multiple field validators, running them in order and returning the first error message.
 * Validators after the first error are skipped (short-circuit). Signal aborts are respected between steps.
 *
 * Works naturally with {@link fieldValidator} — mix schema-based and custom validators in one chain:
 *
 * @example
 * import { s } from '@vielzeug/spell';
 * import { composeValidators, fieldValidator } from '@vielzeug/forge/validators';
 *
 * const passwordValidator = composeValidators(
 *   fieldValidator(s.string().min(8, 'At least 8 characters')),
 *   async (value, signal) => {
 *     const isCompromised = await checkBreachedPasswords(value, signal);
 *     return isCompromised ? 'Password found in breach database' : undefined;
 *   },
 * );
 *
 * const form = createForm({
 *   validators: { password: passwordValidator },
 * });
 */
export function composeValidators<V = unknown>(...validators: FieldValidator<V>[]): FieldValidator<V> {
  return async (value, signal) => {
    for (const validator of validators) {
      if (signal?.aborted) return undefined;

      const result = await validator(value, signal);

      if (result !== undefined) return result;
    }

    return undefined;
  };
}

/**
 * Wraps a `safeParse`-compatible field schema into a `FieldValidator`.
 * The first validation issue message becomes the field error.
 *
 * Works with `@vielzeug/spell`, Zod, Valibot, and any Standard Schema compliant library —
 * no hard dependency required; resolved structurally via `SafeParseSchema`.
 *
 * @example
 * import { s } from '@vielzeug/spell';
 * import { fieldValidator } from '@vielzeug/forge/validators';
 *
 * const form = createForm({
 *   validators: {
 *     email: fieldValidator(s.string().email('Invalid email address')),
 *     age:   fieldValidator(s.number().min(18, 'Must be 18 or older')),
 *   },
 * });
 */
export function fieldValidator<V = unknown>(schema: SafeParseSchema): FieldValidator<V> {
  return (value) => {
    const result = schema.safeParse(value);

    if (result.success) return undefined;

    return result.error.issues[0]?.message;
  };
}
