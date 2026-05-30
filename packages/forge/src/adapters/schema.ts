import { FORM_ERROR, type FormValidator, type SafeParseSchema } from '../types';

/**
 * Adapts a `safeParse`-compatible schema into a `FormValidator`.
 * Works with `@vielzeug/spell`, Zod, Valibot, and Standard Schema compliant libraries.
 *
 * **Note:** When passing a schema directly to `createForm({ validator: mySchema })`, forge
 * auto-detects `safeParse`-compatible schemas and wraps them automatically. Use this explicit
 * adapter when you need custom error message transformation or error filtering.
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

    const errors: Record<string, string> = Object.create(null) as Record<string, string>;

    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || FORM_ERROR;

      if (!errors[key]) errors[key] = issue.message;
    }

    return errors;
  };
}
