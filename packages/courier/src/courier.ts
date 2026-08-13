import { createApi } from './api';
import { CourierDisposedError } from './errors';
import { createQueryCache } from './query';
import { createStreams } from './stream';
import { anySignal, createTransportCore, type TransportOptions } from './transport';
import type { MutationOptions, QueryCache } from './types';

export type CourierOptions = TransportOptions & {
  query?: { staleTime?: number };
};

export type Courier = ReturnType<typeof createCourier>;

/** One application client owns transport, queries, mutations, and streams. */
export function createCourier(options: CourierOptions = {}) {
  const { query: queryOptions, ...transportOptions } = options;
  const transport = createTransportCore(transportOptions);
  const api = createApi({ transport });
  const queryCache = createQueryCache({ ...queryOptions, signal: transport.disposalSignal });
  const queries: QueryCache = queryCache;
  const streams = createStreams(transport);
  const mutations = new Set<AbortController>();

  const mutate = async <T>(options: MutationOptions<T>): Promise<T> => {
    if (transport.disposed) throw new CourierDisposedError('Courier');

    const controller = new AbortController();

    mutations.add(controller);

    const signal = anySignal(options.signal, controller.signal, transport.disposalSignal) ?? controller.signal;

    try {
      const data = await options.request({ signal });

      await options.onSuccess?.(data, queries);

      return data;
    } finally {
      mutations.delete(controller);
    }
  };

  return {
    cancelAll() {
      transport.cancelAll();
      queryCache.cancelAll();
      for (const controller of mutations) controller.abort();
    },
    delete: api.delete,
    get disposalSignal() {
      return transport.disposalSignal;
    },
    dispose() {
      for (const controller of mutations) controller.abort();
      mutations.clear();
      queries.clear();
      transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    events: streams.events,
    get: api.get,
    getHeaders: api.getHeaders,
    headers: transport.headers,
    mutate,
    patch: api.patch,
    post: api.post,
    put: api.put,
    queries,
    read: streams.read,
    request: api.request,
    [Symbol.dispose]() {
      this.dispose();
    },
    use: transport.use,
  };
}
