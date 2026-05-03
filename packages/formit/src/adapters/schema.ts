import type { FormOptions, SafeParseSchema } from '../types';

/**
 * Convert any `safeParse`-compatible schema (Zod, Valibot, …) into a `validator` option
 * ready to spread into `createForm`. Keeps the formit core dependency-free.
 *
 * Root-level issues (path: []) are mapped to the reserved `_form` key.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * const schema = z.object({ email: z.string().email() });
 * const form = createForm({ defaultValues: { email: '' }, ...fromSchema(schema) });
 * ```
 */
export function fromSchema(schema: SafeParseSchema): Pick<FormOptions, 'validator'> {
  return {
    validator: (values) => {
      const result = schema.safeParse(values);

      if (result.success) return undefined;

      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        // Root-level issues (path=[]) are stored under '_form'
        const key = issue.path.join('.') || '_form';

        // First issue per path wins
        if (!errors[key]) errors[key] = issue.message;
      }

      return errors;
    },
  };
}
