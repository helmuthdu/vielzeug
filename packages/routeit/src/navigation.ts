import type {
  NavigateOptions,
  NavigationTarget,
  RouteParams,
  RouteState,
  Middleware,
  RouteHandler,
  RouteContext,
  QueryParams,
} from './types';
import type { RouteRecord } from './types';

import { runMiddleware } from './middleware';
import { buildUrl, matchRecordWithPattern, normalizePath, parseQuery } from './path';

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

/** -------------------- Navigation & Browser Integration -------------------- **/

export function resolvePath(target: NavigationTarget, routesByName: Map<string, RouteRecord>): string {
  if (typeof target === 'string') return target;

  const record = routesByName.get(target.name);

  if (!record) throw new Error('[routeit] Route "${target.name}" not found');

  const path = buildUrl('/', record.path, target.params, target.query);

  return target.hash ? `${path}#${target.hash.replace(/^#/, '')}` : path;
}

export function stripBase(path: string, base: string): string {
  return base !== '/' && path.startsWith(base) ? normalizePath(path.slice(base.length) || '/') : normalizePath(path);
}

export function readLocation(base: string): { hash: string; pathname: string; query: QueryParams } {
  return {
    hash: window.location.hash.slice(1),
    pathname: stripBase(window.location.pathname || '/', base),
    query: parseQuery(window.location.search),
  };
}

export async function handleRoute(
  base: string,
  records: RouteRecord[],
  globalMiddleware: Middleware[],
  onNotFound: RouteHandler | undefined,
  onError: ((error: unknown, context: RouteContext) => void) | undefined,
  useViewTransition: boolean,
  navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>,
  setCurrentState: (state: RouteState) => void,
  notifyListeners: () => void,
  id: number,
  useTransition?: boolean,
): Promise<void> {
  const { hash, pathname, query } = readLocation(base);

  let matchedRecord: RouteRecord | undefined;
  let matchedParams: RouteParams = {};

  for (const record of records) {
    const params = matchRecordWithPattern(pathname, record);

    if (params) {
      matchedRecord = record;
      matchedParams = params;
      break;
    }
  }

  setCurrentState({
    hash,
    meta: matchedRecord?.meta,
    name: matchedRecord?.name,
    params: matchedParams,
    pathname,
    query,
  });

  const run = async (currentId: number): Promise<void> => {
    if (currentId !== id) return;

    if (!matchedRecord) {
      if (onNotFound) {
        await onNotFound({
          hash,
          locals: {},
          meta: undefined,
          navigate,
          params: {},
          pathname,
          query,
        });
      }
    } else {
      await runMiddleware(
        {
          hash,
          locals: {},
          meta: matchedRecord.meta,
          navigate,
          params: matchedParams,
          pathname,
          query,
        },
        globalMiddleware,
        matchedRecord.middleware,
        matchedRecord.handler,
      );
    }
  };

  try {
    const doc = typeof document !== 'undefined' ? (document as ViewTransitionDocument) : null;

    if ((useTransition ?? useViewTransition) && doc?.startViewTransition) {
      await doc.startViewTransition(() => run(id)).finished;
    } else {
      await run(id);
    }
  } catch (error) {
    if (onError) {
      onError(error, {
        hash,
        locals: {},
        meta: matchedRecord?.meta,
        navigate,
        params: matchedParams,
        pathname,
        query,
      });
    } else {
      console.error('[routeit] Route handling error:', error);
    }
  } finally {
    notifyListeners();
  }
}

export function createOnPopState(
  base: string,
  records: RouteRecord[],
  globalMiddleware: Middleware[],
  onNotFound: RouteHandler | undefined,
  onError: ((error: unknown, context: RouteContext) => void) | undefined,
  useViewTransition: boolean,
  navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>,
  setCurrentState: (state: RouteState) => void,
  notifyListeners: () => void,
  nextNavId: () => number,
  setLastHref: (value: string) => void,
  getPendingViewTransition: () => boolean | undefined,
  setPendingViewTransition: (value: boolean | undefined) => void,
): () => void {
  return (): void => {
    const newHref = window.location.pathname + window.location.search;

    setLastHref(newHref);

    void handleRoute(
      base,
      records,
      globalMiddleware,
      onNotFound,
      onError,
      useViewTransition,
      navigate,
      setCurrentState,
      notifyListeners,
      nextNavId(),
      getPendingViewTransition(),
    );
    setPendingViewTransition(undefined);
  };
}
