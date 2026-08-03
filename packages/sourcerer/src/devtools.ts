import type { AnyPagination, Source } from './types';

const isDev = !(globalThis as { __SOURCERER_PROD__?: boolean }).__SOURCERER_PROD__;

export type SourcererDevtoolsOptions = Readonly<{
  label?: string;
}>;

export function debugSource<T, TQuery, TPagination extends AnyPagination>(
  source: Source<T, TQuery, TPagination>,
  options: SourcererDevtoolsOptions = {},
): () => void {
  if (!isDev) return () => {};

  const prefix = `[@vielzeug/sourcerer:${options.label ?? 'source'}]`;
  let previous = source.snapshot;

  return source.subscribe((next) => {
    if (previous.isFetching !== next.isFetching)
      console.debug(`${prefix} isFetching:`, previous.isFetching, '→', next.isFetching);

    if (previous.data.length !== next.data.length) {
      console.debug(`${prefix} data:`, previous.data.length, '→', next.data.length, 'items');
    }

    if (previous.error !== next.error) console.debug(`${prefix} error:`, next.error);

    previous = next;
  });
}
