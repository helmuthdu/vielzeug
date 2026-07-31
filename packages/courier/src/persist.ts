import type { QueryCache, QueryKey } from './types';

import { hash } from './serialize';

export type PersistStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export type PersistOptions = {
  keys: readonly QueryKey[];
  maxAge?: number;
  onError?: (error: unknown, key: QueryKey) => void;
  prefix?: string;
  storage: PersistStorage;
};

type StoredQuery = { data: unknown; updatedAt: number };

export function persistQueries(cache: QueryCache, options: PersistOptions): () => void {
  const { keys, onError, prefix = 'courier:', storage } = options;

  return keys
    .map((key) =>
      cache.subscribe(key, () => {
        const snapshot = cache.getSnapshot(key);

        if (snapshot?.status !== 'success') return;

        try {
          const pending = storage.setItem(
            `${prefix}${hash(key)}`,
            JSON.stringify({ data: snapshot.data, updatedAt: snapshot.updatedAt }),
          );

          if (pending instanceof Promise) pending.catch((error: unknown) => onError?.(error, key));
        } catch (error) {
          onError?.(error, key);
        }
      }),
    )
    .reduce<() => void>(
      (dispose, unsubscribe) => () => {
        dispose();
        unsubscribe();
      },
      () => {},
    );
}

export async function hydrateQueries(cache: QueryCache, options: PersistOptions): Promise<void> {
  const { keys, maxAge, onError, prefix = 'courier:', storage } = options;

  await Promise.all(
    keys.map(async (key) => {
      try {
        const raw = await storage.getItem(`${prefix}${hash(key)}`);

        if (!raw) return;

        const value: unknown = JSON.parse(raw);

        if (
          typeof value !== 'object' ||
          value === null ||
          !('data' in value) ||
          typeof (value as { updatedAt?: unknown }).updatedAt !== 'number'
        ) {
          throw new Error('[courier] malformed persisted query');
        }

        const stored = value as StoredQuery;

        if (maxAge !== undefined && Date.now() - stored.updatedAt > maxAge) return;

        cache.set(key, stored.data, { updatedAt: stored.updatedAt });
      } catch (error) {
        onError?.(error, key);
      }
    }),
  );
}
