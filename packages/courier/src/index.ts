// API client
export { createApi } from './api';
export type { ApiClient, FetchContext, Interceptor } from './api';

// Batcher (DataLoader pattern — coalesces load() calls into single resolve())
export { createBatcher } from './batcher';
export type { Batcher, BatcherOptions } from './batcher';

// Root factory
export { createCourier } from './courier';
export type { Courier, CourierMutationOptions, CourierOptions } from './courier';

// Errors
export { AbortError, CourierError, HttpError, NetworkError, SchemaValidationError, TimeoutError } from './errors';

// Focus / reconnect binding helper (opt-in)
export { bindRefetch } from './focus';

// Built-in interceptor presets
export { withBearerAuth, withLogging, withRequestId } from './interceptors';

// Mutation
export { createMutation } from './mutation';
export type { Mutation, MutationFn, MutationOptions, SettledResult } from './mutation';

// Query cache persistence
export { hydrateQueryCache, persistQueryCache } from './persist';
export type { PersistOptions, PersistStorage } from './persist';

// Query client
export { createQuery } from './query';
export type { ObserveOptions, QueryClient, QueryClientOptions, QueryFn, QueryFnContext, QueryOptions } from './query';

// SyncStore adapter utility — convert a Mutation or QueryClient store to a plain SyncStore
export { toSyncStore } from './sync-store';

// Response parsing
export type { ResponseType } from './response';

// Retry options
export type { RetryOptions } from './retry';

// Stream client (SSE + ReadableStream)
export { createStream } from './stream';
export type {
  ReadableConfig,
  ReconnectOptions,
  SseOptions,
  SseSource,
  SseStatus,
  StreamClient,
  StreamRequestConfig,
} from './stream';

// Transport options (for createApi / createStream configuration)
export type { TransportOptions } from './transport';

// Core types
export type {
  AsyncState,
  AsyncStatus,
  MutationState,
  QueryKey,
  QueryKeyAtom,
  QueryState,
  SyncStore,
  Unsubscribe,
} from './types';

// URL / request config
export type { CourierRequestConfig as RequestConfig, HttpRequestConfig, Params } from './url';
