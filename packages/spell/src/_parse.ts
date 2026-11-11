import type { Messages } from './messages';
import type { ErrorCode, Issue, MessageFn } from './types';

export type MaybePromise<T> = T | Promise<T>;

/** Context threaded through one parse. `async: false` forbids async checks. */
export type RunContext = { readonly async: boolean; readonly messages: Messages };

/** Result of running a schema: `issues` is empty on success. */
export type Outcome = { issues: Issue[]; value: unknown };

/**
 * Result of a schema's own structural parse. `typeOk: false` means the value has the wrong shape,
 * so the schema's checks and transforms must not run.
 */
export type ParseValue = Outcome & { typeOk: boolean };

/** Applies `fn` synchronously when `value` is not a promise. */
export function chain<T, R>(value: MaybePromise<T>, fn: (value: T) => MaybePromise<R>): MaybePromise<R> {
  return value instanceof Promise ? value.then(fn) : fn(value);
}

/** `Promise.all` that stays synchronous when no element is a promise. */
export function all<T>(values: MaybePromise<T>[]): MaybePromise<T[]> {
  return values.some((value) => value instanceof Promise) ? Promise.all(values) : (values as T[]);
}

type IssueParams<C extends ErrorCode> = Extract<Issue, { code: C }>['params'];

export function issue<C extends ErrorCode>(
  code: C,
  message: string,
  ...[params]: undefined extends IssueParams<C> ? [params?: IssueParams<C>] : [params: IssueParams<C>]
): Issue {
  return (params === undefined ? { code, message, path: [] } : { code, message, params, path: [] }) as Issue;
}

export function resolveMessage<Ctx extends Record<string, unknown>>(message: MessageFn<Ctx>, ctx: Ctx): string {
  return typeof message === 'function' ? message(ctx) : message;
}

export function prefixIssues(issues: readonly Issue[], segment: string | number): Issue[] {
  return issues.map((entry) => ({ ...entry, path: [segment, ...entry.path] }));
}

/** Tightest lower bound of an existing (optional) bound and a new one. */
export const atLeast = <N extends number | bigint>(current: N | undefined, next: N): N =>
  current === undefined || next > current ? next : current;

/** Tightest upper bound of an existing (optional) bound and a new one. */
export const atMost = <N extends number | bigint>(current: N | undefined, next: N): N =>
  current === undefined || next < current ? next : current;

export const ok = (value: unknown): ParseValue => ({ issues: [], typeOk: true, value });

export const invalid = (value: unknown, ...issues: Issue[]): ParseValue => ({ issues, typeOk: false, value });
