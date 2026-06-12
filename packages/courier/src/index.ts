// Errors
export { CourierError, HttpError, SchemaValidationError } from './errors';

// Core types
export type {
  AsyncState,
  AsyncStatus,
  MutationState,
  MutationStatus,
  QueryKey,
  QueryState,
  QueryStatus,
  StableValue,
  SyncStore,
  Unsubscribe,
} from './types';

// Retry options and delay resolver
export { NO_RETRY, resolveRetryDelay } from './retry';
export type { RetryOptions } from './retry';

// URL / request config
export type { CourierRequestConfig, HttpRequestConfig, ParamValue, Params, PathConfig } from './url';

// Response parsing
export type { ResponseType } from './response';

// Transport — shared pipeline exposed for advanced use
export { anySignal, createTransportCore } from './transport';
export type { FetchContext, Interceptor, TransportCore, TransportOptions } from './transport';

// API client
export { createApi } from './api';
export type { ApiClient } from './api';

// Query client
export { createQuery } from './query';
export type { PrefetchOptions, QueryClient, QueryClientOptions, QueryFnContext, QueryOptions } from './query';

// Focus / reconnect binding helper (opt-in; replaces removed refetchOnFocus/refetchOnReconnect options)
export { bindRefetch } from './focus';

// Mutation
export { createMutation } from './mutation';
export type { Mutation, MutationFn, MutationOptions } from './mutation';

// Stream client (SSE + ReadableStream)
export { createStream } from './stream';
export type {
  ReadableConfig,
  ReconnectOptions,
  SseOptions,
  SseSource,
  StreamClient,
  StreamRequestConfig,
} from './stream';

// Root factory
export { createCourier } from './courier';
export type { Courier, CourierOptions } from './courier';

// DataLoader-style request batcher
export { createBatcher } from './batcher';
export type { Batcher, BatcherOptions } from './batcher';

// Built-in interceptor presets
export { withBearerAuth, withLogging, withRequestId } from './interceptors';

// Query cache persistence
export { hydrateQueryCache, persistQueryCache } from './persist';
export type { PersistOptions, PersistStorage } from './persist';
