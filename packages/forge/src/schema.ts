import { abortable } from '@vielzeug/arsenal';

import type { FormValidator, ValidationIssue } from './types.js';

export type StandardSchemaLike<Output> = {
  readonly '~standard': {
    readonly validate: (
      value: unknown,
    ) =>
      | PromiseLike<
          | { readonly issues: readonly { readonly message: string; readonly path?: readonly unknown[] }[] }
          | { readonly value: Output }
        >
      | { readonly issues: readonly { readonly message: string; readonly path?: readonly unknown[] }[] }
      | { readonly value: Output };
  };
};

const toPath = (path: readonly unknown[] | undefined): ValidationIssue['path'] => {
  const result: Array<string | number> = [];

  for (const part of path ?? []) {
    const key = typeof part === 'object' && part !== null && 'key' in part ? part.key : part;
    if (typeof key === 'string') result.push(key);
    else if (typeof key === 'number' && Number.isSafeInteger(key) && key >= 0) result.push(key);
    else return [];
  }

  return result;
};

export function schemaValidator<TValues extends Record<string, unknown>>(
  schema: StandardSchemaLike<TValues>,
): FormValidator<TValues> {
  return async (values, signal) => {
    if (signal.aborted) return undefined;

    const result = await abortable(Promise.resolve(schema['~standard'].validate(values)), signal);

    if (signal.aborted || 'value' in result) return undefined;

    return result.issues.map((issue) => ({ message: issue.message, path: toPath(issue.path) }));
  };
}
