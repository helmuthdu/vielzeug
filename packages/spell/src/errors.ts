import { ErrorCode, type Issue, type MessageFn } from './types';

/* -------------------- Helpers -------------------- */

type IssueParams<C extends string> = Extract<Issue, { code: C }> extends { params: infer P } ? P : undefined;

/**
 * Creates a single-error failure array. Use in validator functions instead of building the array manually.
 * Typed overloads ensure params match the given error code.
 */
export function fail<C extends ErrorCode>(code: C, message: string, params: IssueParams<C>): Issue[];
export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[];
export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[] {
  return [{ code, message, params, path: [] } as Issue];
}

/** @internal */
export function resolveMessage<Ctx extends Record<string, unknown>>(msg: MessageFn<Ctx>, ctx: Ctx): string {
  return typeof msg === 'function' ? msg(ctx) : msg;
}

export function prependIssuePath(issues: Issue[], prefix: string | number): Issue[] {
  return issues.map((issue) => ({ ...issue, path: [prefix, ...issue.path] }));
}

/* -------------------- SpellError -------------------- */

/** Base class for all spell errors. Use `instanceof SpellError` to catch any spell-originated error. */
export class SpellError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is SpellError {
    return err instanceof SpellError;
  }
}

/* -------------------- SpellValidationError -------------------- */

function formatIssues(issues: Issue[]): string {
  return issues
    .map(({ code, message, path }) => {
      const pathStr = path.length ? path.join('.') : 'value';

      return `${pathStr}: ${message} [${code}]`;
    })
    .join('\n');
}

function pathsEqual(left: readonly (string | number)[], right: readonly (string | number)[]): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

export type FlatError = { messages: string[]; path: (string | number)[] };
export type FlatErrorFirst = { message: string; path: (string | number)[] };

export class SpellDefinitionError extends SpellError {}

export class SpellValidationError extends SpellError {
  readonly issues: Issue[];

  constructor(issues: Issue[], cause?: unknown) {
    super(formatIssues(issues), { cause });
    this.issues = issues;
  }

  /**
   * Returns the most-specific branch errors for `issue`, or the first union issue when omitted.
   * Surfaces the branch with the fewest issues at the deepest path — the one that "came closest" to matching.
   */
  bestMatch(issue?: Extract<Issue, { code: 'invalid_union' }>): Issue[] | null {
    const unionIssue =
      issue ??
      this.issues.find(
        (entry): entry is Extract<Issue, { code: 'invalid_union' }> => entry.code === ErrorCode.invalid_union,
      );

    if (!unionIssue) return null;

    const branches = unionIssue.params.errors;

    if (branches.length === 0) return null;

    const scored = branches.map((branchIssues) => {
      const maxDepth = branchIssues.reduce((d, i) => Math.max(d, i.path.length), 0);

      return { issues: branchIssues, score: maxDepth * 1000 - branchIssues.length };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0]!.issues;
  }

  flatten(): { fieldErrors: FlatError[]; formErrors: string[] } {
    const fieldErrors: FlatError[] = [];
    const formErrors: string[] = [];
    const pathMap = new Map<string, number>();

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = JSON.stringify(issue.path);
        const existing = pathMap.get(key);

        if (existing !== undefined) {
          fieldErrors[existing]!.messages.push(issue.message);
        } else {
          pathMap.set(key, fieldErrors.length);
          fieldErrors.push({ messages: [issue.message], path: [...issue.path] });
        }
      }
    }

    return { fieldErrors, formErrors };
  }

  flattenFirst(): { fieldErrors: FlatErrorFirst[]; formErrors: string[] } {
    const { fieldErrors, formErrors } = this.flatten();

    return {
      fieldErrors: fieldErrors.map((fe) => ({ message: fe.messages[0]!, path: fe.path })),
      formErrors,
    };
  }

  /** Returns every message attached to exactly `path`, in issue order. */
  messagesAt(...path: (string | number)[]): string[] {
    return this.issues.filter((issue) => pathsEqual(issue.path, path)).map((issue) => issue.message);
  }
}
