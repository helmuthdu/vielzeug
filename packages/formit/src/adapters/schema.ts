import type { FormValidator, SafeParseSchema } from '../types';

/**
 * Adapts a `safeParse`-compatible schema (Zod, Valibot, Standard Schema) into a
 * `FormValidator` that can be passed to `createForm({ validator: schemaValidator(schema) })`.
 *
 * Root-level issues (path `[]`) are stored under the `_form` key.
 * When multiple issues target the same path, the first one wins.
 */
export function schemaValidator<TValues extends Record<string, unknown>>(
  schema: SafeParseSchema,
): FormValidator<TValues> {
  return (values) => {
    const result = schema.safeParse(values);

    if (result.success) return undefined;

    const errors: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_form';

      if (!errors[key]) errors[key] = issue.message;
    }

    return errors;
  };
}
