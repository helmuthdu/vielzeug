import type { Issue, Schema, SchemaMode } from '@vielzeug/spell';
import { writeError } from './core/path';
import type { FormErrors, FormValidator, ValidationErrors } from './types';

type ErrorTree = Record<string, unknown>;
type UnionIssue = Extract<Issue, { code: 'invalid_union' }>;

function isUnionIssue(issue: Issue): issue is UnionIssue {
  return issue.code === 'invalid_union';
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | undefined> {
  if (signal.aborted) return Promise.resolve(undefined);

  return new Promise((resolve, reject) => {
    const abort = () => resolve(undefined);

    signal.addEventListener('abort', abort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

function fieldPath(path: readonly (string | number)[]): string[] {
  const segments: string[] = [];

  for (const segment of path) {
    if (typeof segment === 'number') break;

    segments.push(segment);
  }

  return segments;
}

function prefixIssues(path: readonly (string | number)[], issues: readonly Issue[]): Issue[] {
  return issues.map((issue) => ({ ...issue, path: [...path, ...issue.path] }));
}

/** Adapts a Spell Schema into Forge's full-form validator without transforming form values. */
export function customValidator<TValues extends Record<string, unknown>>(
  schema: Schema<unknown, TValues, SchemaMode>,
): FormValidator<TValues> {
  return async (values, signal) => {
    const result = await abortable(schema.safeParseAsync(values), signal);

    if (!result || result.success) return undefined;

    const issues = result.error.issues.flatMap((issue) => {
      if (!isUnionIssue(issue)) return [issue];

      const bestMatch = result.error.bestMatch(issue);

      return bestMatch ? prefixIssues(issue.path, bestMatch) : [issue];
    });
    let fields: ErrorTree = {};
    let formError: string | undefined;

    for (const issue of issues) {
      if (issue.path.length === 0) {
        formError ??= issue.message;
        continue;
      }

      fields = writeError(fields, fieldPath(issue.path), issue.message);
    }

    const errors: ValidationErrors<TValues> = {
      fields: Object.keys(fields).length === 0 ? undefined : (fields as FormErrors<TValues>),
      formError,
    };

    return errors.fields === undefined && errors.formError === undefined ? undefined : errors;
  };
}
