import { ErrorCode, type Issue, type MessageFn } from './types';

/* -------------------- Helpers -------------------- */

type IssueParams<C extends string> = Extract<Issue, { code: C }> extends { params: infer P } ? P : undefined;

/**
 * Creates a single-issue failure array. Use in validator functions instead of building the array manually.
 * Typed overloads ensure params match the given error code.
 */
export function fail<C extends ErrorCode>(code: C, message: string, params: IssueParams<C>): Issue[];
export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[];
export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[] {
  return [{ code, message, params, path: [] } as Issue];
}

export function resolveMessage<Ctx extends Record<string, unknown>>(msg: MessageFn<Ctx>, ctx: Ctx): string {
  return typeof msg === 'function' ? msg(ctx) : msg;
}

export function prependIssuePath(issues: Issue[], prefix: string | number): Issue[] {
  return issues.map((issue) => ({ ...issue, path: [prefix, ...issue.path] }));
}

/* -------------------- FormattedErrors -------------------- */

export type FormattedErrors = {
  _errors: string[];
  [key: string]: FormattedErrors | string[];
};

export function errorsAt(formatted: FormattedErrors, ...path: (string | number)[]): string[] {
  let node: FormattedErrors | string[] = formatted;

  for (const key of path) {
    if (Array.isArray(node)) return [];

    node = (node as FormattedErrors)[String(key)] ?? { _errors: [] };
  }

  return Array.isArray(node) ? node : (node as FormattedErrors)._errors;
}

/* -------------------- ValidationError -------------------- */

function formatIssues(issues: Issue[]): string {
  return issues
    .map(({ code, message, path }) => {
      const pathStr = path.length ? path.join('.') : 'value';

      return `${pathStr}: ${message} [${code}]`;
    })
    .join('\n');
}

export type FlatError = { messages: string[]; path: (string | number)[] };
export type FlatErrorFirst = { message: string; path: (string | number)[] };

function createFormattedErrors(): FormattedErrors {
  const node = Object.create(null) as FormattedErrors;

  node._errors = [];

  return node;
}

export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[], cause?: unknown) {
    super(formatIssues(issues), { cause });
    this.name = 'ValidationError';
    this.issues = issues;
  }

  static is(value: unknown): value is ValidationError {
    return value instanceof ValidationError;
  }

  /**
   * Returns the union branch errors from the most-specific failing branch.
   * Surfaces the branch with the fewest issues at the deepest path — the one
   * that "came closest" to matching.
   */
  bestMatch(): Issue[] | null {
    const unionIssue = this.issues.find(
      (i): i is Extract<Issue, { code: 'invalid_union' }> => i.code === ErrorCode.invalid_union,
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

  format(): FormattedErrors {
    const root = createFormattedErrors();

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        root._errors.push(issue.message);
        continue;
      }

      let node = root;

      for (const segment of issue.path) {
        const key = String(segment);

        if (!Object.hasOwn(node, key)) {
          node[key] = createFormattedErrors();
        }

        node = node[key] as FormattedErrors;
      }

      node._errors.push(issue.message);
    }

    return root;
  }
}
