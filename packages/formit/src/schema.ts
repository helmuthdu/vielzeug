import type { FormOptions, SafeParseSchema } from './types';

/**
 * Convert any `safeParse`-compatible schema (Zod, Valibot, …) into a `validator` option
 * ready to spread into `createForm`. Keeps the formit core dependency-free.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * const schema = z.object({ email: z.string().email() });
 * const form = createForm({ defaultValues: { email: '' }, ...fromSchema(schema) });
 * ```
 */
export function fromSchema<TValues extends Record<string, unknown>>(
  schema: SafeParseSchema,
): Pick<FormOptions<TValues>, 'validator'> {
  return {
    validator: (values) => {
      const result = schema.safeParse(values);

      if (result.success) return undefined;

      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const key = issue.path.join('.');

        // First issue per path wins
        if (key && !errors[key]) errors[key] = issue.message;
      }

      return errors;
    },
  };
}
