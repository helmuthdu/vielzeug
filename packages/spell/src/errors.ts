import type { Issue, IssuePath } from './types';

/** Base class for all spell errors. Use `instanceof SpellError` to catch any spell-originated error. */
export class SpellError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The schema cannot perform the requested operation: a non-portable `definition()` or an invalid derivation. */
export class SpellDefinitionError extends SpellError {}

export type FlatError = { messages: string[]; path: (string | number)[] };
export type FlatErrorFirst = { message: string; path: (string | number)[] };

/**
 * Flattens an issue path into a UI key such as `'permissions.0.slug'`. Handles spell-native
 * `(string | number)[]` paths and Standard Schema paths with `{ key }` segments; empty or
 * undefined paths join to `''`.
 */
export function joinIssuePath(path: IssuePath | undefined, separator = '.'): string {
  if (!path) return '';

  return path
    .map((segment) => String(typeof segment === 'object' && segment !== null ? segment.key : segment))
    .join(separator);
}

function pathsEqual(left: readonly (string | number)[], right: readonly (string | number)[]): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

/** Validation failure carrying every issue found during the parse. */
export class SpellValidationError extends SpellError {
  readonly issues: readonly Issue[];

  constructor(issues: readonly Issue[], opts?: ErrorOptions) {
    super(
      issues.map(({ code, message, path }) => `${joinIssuePath(path) || 'value'}: ${message} [${code}]`).join('\n'),
      opts,
    );
    this.issues = Object.freeze([...issues]);
  }

  /** Groups messages by exact path; root-level messages become `formErrors`. */
  flatten(): { fieldErrors: FlatError[]; formErrors: string[] } {
    const fieldErrors: FlatError[] = [];
    const formErrors: string[] = [];
    const byPath = new Map<string, FlatError>();

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
        continue;
      }

      const key = JSON.stringify(issue.path);
      const existing = byPath.get(key);

      if (existing) {
        existing.messages.push(issue.message);
      } else {
        const entry = { messages: [issue.message], path: [...issue.path] };

        byPath.set(key, entry);
        fieldErrors.push(entry);
      }
    }

    return { fieldErrors, formErrors };
  }

  /** Like `flatten()`, keeping only the first message per path. */
  flattenFirst(): { fieldErrors: FlatErrorFirst[]; formErrors: string[] } {
    const { fieldErrors, formErrors } = this.flatten();

    return { fieldErrors: fieldErrors.map(({ messages, path }) => ({ message: messages[0]!, path })), formErrors };
  }

  /** Returns every message attached to exactly `path`, in issue order. */
  messagesAt(...path: (string | number)[]): string[] {
    return this.issues.filter((issue) => pathsEqual(issue.path, path)).map((issue) => issue.message);
  }
}
