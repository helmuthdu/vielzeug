// Errors
export { HttpError } from './errors';

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

// Retry options
export type { RetryOptions } from './retry';

// URL / request config
export type { FetchitRequestConfig, HttpRequestConfig, ParamValue, Params, PathConfig } from './url';

// Response parsing
export type { ResponseType } from './response';

// Transport (interceptor pipeline, shared by api + stream)
export type { FetchContext, Interceptor, TransportOptions } from './transport';

// API client
export { createApi } from './api';
export type { ApiClient, ApiClientOptions } from './api';

// Query client
export { createQuery } from './query';
export type { PrefetchOptions, QueryClient, QueryClientOptions, QueryFnContext, QueryOptions } from './query';

// Mutation
export { createMutation } from './mutation';
export type { Mutation, MutationFn, MutationOptions } from './mutation';

// Stream client (SSE + ReadableStream)
export { createStream } from './stream';
export type {
  ReconnectOptions,
  SseOptions,
  SseSource,
  StreamClient,
  StreamClientOptions,
  StreamRequestConfig,
} from './stream';

// Root factory
export { createFetchit } from './fetchit';
export type { Fetchit, FetchitOptions } from './fetchit';
