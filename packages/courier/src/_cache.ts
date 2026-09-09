import { cache } from '@vielzeug/arsenal/cache';
import { hash } from '@vielzeug/arsenal/object';

import { CourierError, classifyRequestError } from './errors.js';
import { buildTimeoutSignal, validateTimeout } from './transport.js';
import type { CourierCacheKey, CourierCacheOptions, CourierReadCache } from './url.js';

const DEFAULT_CAPACITY = 100;
const DEFAULT_TTL = 30_000;

type Stored = {
  cachedAt: number;
  data: unknown;
  key: CourierCacheKey;
};

type Pending = {
  cacheable: boolean;
  controller: AbortController;
  id: string;
  key: CourierCacheKey;
  owners: number;
  promise: Promise<unknown>;
  settled: boolean;
  ttlMs: number;
  waiters: number;
};

type LoadOptions<T> = {
  cache: CourierReadCache;
  load: (signal: AbortSignal) => Promise<T>;
  signal?: AbortSignal;
  timeout: number;
  url: string;
};

type PrefetchOptions<T> = Omit<LoadOptions<T>, 'signal' | 'timeout' | 'url'>;

function duration(value: number, name: string): number {
  if (value !== Number.POSITIVE_INFINITY && (!Number.isFinite(value) || value < 0)) {
    throw new CourierError(`${name} must be a non-negative finite number or Infinity`);
  }
  return value;
}

function capacity(value: number): number {
  if (value !== Number.POSITIVE_INFINITY && (!Number.isInteger(value) || value < 1)) {
    throw new CourierError('cache.capacity must be a positive integer or Infinity');
  }
  return value;
}

function keyId(key: CourierCacheKey): string {
  if (!Array.isArray(key) || key.length === 0) throw new CourierError('cache.key must be a non-empty array');

  for (const atom of key) {
    if (atom !== null && !['boolean', 'number', 'string'].includes(typeof atom)) {
      throw new CourierError('cache.key atoms must be strings, finite numbers, booleans, or null');
    }
    if (typeof atom === 'number' && !Number.isFinite(atom)) {
      throw new CourierError('cache.key numbers must be finite');
    }
  }

  return hash(key);
}

function matches(key: CourierCacheKey, prefix: CourierCacheKey): boolean {
  return prefix.length <= key.length && prefix.every((atom, index) => atom === key[index]);
}

function waitFor<T>(promise: Promise<T>, signal: AbortSignal | undefined, url: string): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(classifyRequestError(signal.reason, 'GET', url, signal));

  return new Promise<T>((resolve, reject) => {
    const abort = (): void => reject(classifyRequestError(signal.reason, 'GET', url, signal));
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

export function createReadCache(options?: CourierCacheOptions) {
  const defaultTtl = duration(options?.ttlMs ?? DEFAULT_TTL, 'cache.ttlMs');
  const values = cache<string, Stored>({ capacity: capacity(options?.capacity ?? DEFAULT_CAPACITY) });
  const pending = new Map<string, Pending>();
  const active = new Set<Pending>();

  const resolveCache = (config: CourierReadCache): { id: string; key: CourierCacheKey; ttlMs: number } => {
    const id = keyId(config.key);
    const key = Object.freeze([...config.key]) as CourierCacheKey;
    return { id, key, ttlMs: duration(config.ttlMs ?? defaultTtl, 'cache.ttlMs') };
  };

  const readStored = (id: string, ttlMs: number): Stored | undefined => {
    const stored = values.get(id);
    if (!stored) return undefined;
    if (ttlMs !== Number.POSITIVE_INFINITY && Date.now() - stored.cachedAt >= ttlMs) {
      values.delete(id);
      return undefined;
    }
    return stored;
  };

  const release = (entry: Pending, owner: 'prefetch' | 'waiter'): void => {
    if (owner === 'prefetch') entry.owners--;
    else entry.waiters--;
    if (entry.settled || entry.owners > 0 || entry.waiters > 0) return;
    entry.cacheable = false;
    if (pending.get(entry.id) === entry) pending.delete(entry.id);
    entry.controller.abort();
  };

  const start = <T>(
    id: string,
    key: CourierCacheKey,
    ttlMs: number,
    load: (signal: AbortSignal) => Promise<T>,
  ): Pending => {
    const controller = new AbortController();
    const entry: Pending = {
      cacheable: true,
      controller,
      id,
      key,
      owners: 0,
      promise: undefined as unknown as Promise<unknown>,
      settled: false,
      ttlMs,
      waiters: 0,
    };
    let loaded: Promise<T>;
    try {
      loaded = Promise.resolve(load(controller.signal));
    } catch (error) {
      loaded = Promise.reject(error);
    }
    const promise = loaded
      .then((data) => {
        if (entry.cacheable && !controller.signal.aborted) {
          values.set(id, { cachedAt: Date.now(), data, key }, { ttlMs: entry.ttlMs });
        }
        return data;
      })
      .finally(() => {
        entry.settled = true;
        active.delete(entry);
        if (pending.get(id) === entry) pending.delete(id);
      });

    entry.promise = promise;
    pending.set(id, entry);
    active.add(entry);
    return entry;
  };

  const obtain = <T>(config: CourierReadCache, load: (signal: AbortSignal) => Promise<T>) => {
    const resolved = resolveCache(config);
    const stored = readStored(resolved.id, resolved.ttlMs);
    if (stored) return { ...resolved, stored };

    const entry = pending.get(resolved.id) ?? start(resolved.id, resolved.key, resolved.ttlMs, load);
    entry.ttlMs = Math.min(entry.ttlMs, resolved.ttlMs);
    return { ...resolved, entry };
  };

  return {
    cancelAll(): void {
      for (const entry of active) {
        entry.cacheable = false;
        entry.controller.abort();
      }
      pending.clear();
    },
    clear(): void {
      values.clear();
      for (const entry of active) entry.cacheable = false;
      pending.clear();
    },
    dispose(): void {
      values.clear();
      for (const entry of active) {
        entry.cacheable = false;
        entry.controller.abort();
      }
      pending.clear();
      active.clear();
    },
    invalidate(prefix: CourierCacheKey): void {
      keyId(prefix);
      for (const [id, stored] of values.entries()) {
        if (matches(stored.key, prefix)) values.delete(id);
      }
      for (const entry of active) {
        if (!matches(entry.key, prefix)) continue;
        entry.cacheable = false;
        if (pending.get(entry.id) === entry) pending.delete(entry.id);
      }
    },
    prefetch<T>({ cache: config, load }: PrefetchOptions<T>): Promise<void> {
      const result = obtain(config, load);
      if ('stored' in result) return Promise.resolve();

      result.entry.owners++;
      return result.entry.promise
        .then(
          () => undefined,
          () => undefined,
        )
        .finally(() => release(result.entry, 'prefetch'));
    },
    read<T>({ cache: config, load, signal, timeout, url }: LoadOptions<T>): Promise<T> {
      validateTimeout(timeout);
      const callerSignal = buildTimeoutSignal(timeout, signal);
      if (callerSignal?.aborted) {
        return Promise.reject(classifyRequestError(callerSignal.reason, 'GET', url, callerSignal));
      }

      const result = obtain(config, load);
      if ('stored' in result) return Promise.resolve(result.stored.data as T);

      result.entry.waiters++;
      return waitFor(result.entry.promise as Promise<T>, callerSignal, url).finally(() =>
        release(result.entry, 'waiter'),
      );
    },
  };
}
