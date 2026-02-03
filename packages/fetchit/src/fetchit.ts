import { Logit } from '@vielzeug/logit';

type RequestParams = Record<string, string | number | undefined>;

export type RequestResponse<T> = {
  data: T;
  ok: boolean;
  status: number;
};

type RequestConfig = Omit<RequestInit, 'body'> & {
  id?: string;
  cancelable?: boolean;
  invalidate?: boolean;
  body?: unknown;
};

type ContextProps = {
  expiresIn?: number;
  headers?: Record<string, string | undefined>;
  params?: RequestParams;
  timeout?: number;
  url: string;
};

/**
 * Custom error class for HTTP request failures with additional context.
 */
export class HttpError extends Error {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly originalError?: unknown;

  constructor(message: string, url: string, method: string, status?: number, originalError?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.url = url;
    this.method = method;
    this.status = status;
    this.originalError = originalError;
  }
}

const REQUEST_TIMEOUT = 5000;
const CACHE_EXPIRES_IN = 120000;

export const RequestErrorType = {
  ABORTED: 499,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_ALLOWED: 405,
  NOT_FOUND: 404,
  PRE_CONDITION: 412,
  TIMEOUT: 408,
  UNAUTHORIZED: 401,
} as const;

export const RequestStatus = {
  ERROR: 'ERROR',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
} as const;

type RequestStatusType = (typeof RequestStatus)[keyof typeof RequestStatus];

type RequestData<T> = {
  controller: AbortController;
  expiresIn: number;
  request: Promise<RequestResponse<T>>;
  status: RequestStatusType;
};

const HttpCache = new Map<string, RequestData<unknown>>();

/**
 * Generates a unique cache key for a request.
 * Uses custom id if provided, otherwise creates a key from url and config.
 */
function getCacheKey(url: string, config: RequestConfig): string {
  if (config.id) return config.id;

  // Create a stable cache key from url and relevant config properties
  const { method = 'GET', body, headers } = config;
  return JSON.stringify({ body, headers, method, url });
}

/**
 * Logs HTTP request results with elapsed time and details.
 */
function log(type: 'SUCCESS' | 'ERROR', url: string, req: RequestInit, res: unknown, startTime: number): void {
  const elapsed = Date.now() - startTime;
  const logType = type.toLowerCase() as 'success' | 'error';
  const method = req.method?.toUpperCase() ?? 'GET';
  const shortUrl = formatUrlForLog(url);
  const icon = type === 'SUCCESS' ? '✓' : '✕';

  Logit[logType](`HTTP::${method}(…/${shortUrl}) ${icon} ${elapsed}ms`, {
    req,
    res,
    url,
  });
}

/**
 * Formats URL for logging by removing protocol and domain.
 */
function formatUrlForLog(url: string): string {
  return url.replace(/^https?:\/\/[^/]+\//, '');
}

/**
 * Core fetch function with retry logic and proper error handling.
 */
async function fetcher<T>(
  url: string,
  config: RequestInit,
  { id, retries = 2 }: { id?: string; retries?: number },
): Promise<RequestResponse<T>> {
  const startTime = Date.now();
  const method = config.method?.toUpperCase() ?? 'GET';

  try {
    const response = await fetch(url, config);
    const data = await parseResponse<T>(response);

    log('SUCCESS', url, config, data, startTime);
    updateCacheStatus(id, RequestStatus.SUCCESS);

    return { data, ok: response.ok, status: response.status };
  } catch (error) {
    log('ERROR', url, config, error, startTime);
    updateCacheStatus(id, RequestStatus.ERROR);

    // Retry on network errors
    if (retries > 0 && error instanceof TypeError) {
      return fetcher(url, config, { id, retries: retries - 1 });
    }

    // Wrap error with additional context
    throw new HttpError(error instanceof Error ? error.message : 'Request failed', url, method, undefined, error);
  } finally {
    // Clean up non-GET requests from cache
    if (id && config.method !== 'GET') {
      HttpCache.delete(id);
    }
  }
}

/**
 * Parses response based on content type.
 * Handles empty responses (204 No Content, etc.) and various content types.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  // Handle empty responses (204 No Content, etc.)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text')) {
    return response.text() as Promise<T>;
  }

  // Default to blob for binary data, form data, etc.
  return response.blob() as Promise<T>;
}

/**
 * Updates cache entry status if it exists.
 */
function updateCacheStatus(id: string | undefined, status: RequestStatusType): void {
  const cached = id ? HttpCache.get(id) : undefined;
  if (cached) cached.status = status;
}

/**
 * Makes an HTTP request with caching and cancellation support.
 */
async function makeRequest<T>(url: string, config: RequestConfig, context?: ContextProps): Promise<RequestResponse<T>> {
  const key = getCacheKey(url, config);
  let cached = HttpCache.get(key) as RequestData<T> | undefined;

  // Invalidate cache if needed
  if (cached && shouldInvalidateCache(config, cached)) {
    cached.controller.abort('Request aborted');
    HttpCache.delete(key);
    cached = undefined;
  }

  // Return cached response if valid
  if (cached && isCacheValid(cached)) {
    return cached.request;
  }

  // Create and execute new request
  const controller = new AbortController();
  const fullUrl = buildFullUrl(url, context);
  const requestConfig = buildRequestConfig(config, context, controller);
  const request = fetcher<T>(fullUrl, requestConfig, { id: key });

  HttpCache.set(key, {
    controller,
    expiresIn: Date.now() + (context?.expiresIn ?? CACHE_EXPIRES_IN),
    request,
    status: RequestStatus.PENDING,
  });

  return request;
}

/**
 * Checks if a cache should be invalidated.
 */
function shouldInvalidateCache<T>(config: RequestConfig, cached: RequestData<T> | undefined): boolean {
  if (config.invalidate) return true;
  if (!cached) return false;

  return (config.cancelable && cached.status === RequestStatus.PENDING) || cached.status === RequestStatus.ERROR;
}

/**
 * Checks if a cache entry is still valid.
 */
function isCacheValid<T>(cached: RequestData<T>): boolean {
  return Date.now() <= cached.expiresIn;
}

/**
 * Builds the full URL with a context path.
 * Handles trailing/leading slashes to avoid double slashes.
 */
function buildFullUrl(url: string, context?: ContextProps): string {
  if (!context?.url) return url;

  const baseUrl = context.url.replace(/\/+$/, ''); // Remove trailing slashes
  const path = url.replace(/^\/+/, ''); // Remove leading slashes
  return `${baseUrl}/${path}`;
}

/**
 * Checks if a value is a native BodyInit type that shouldn't be serialized.
 */
function isBodyInit(value: unknown): value is BodyInit {
  return (
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof URLSearchParams ||
    typeof value === 'string'
  );
}

/**
 * Builds the request configuration with merged headers and signal.
 * Automatically handles JSON serialization and sets appropriate Content-Type.
 */
function buildRequestConfig(
  config: RequestConfig,
  context: ContextProps | undefined,
  controller: AbortController,
): RequestInit {
  const timeout = context?.timeout ?? REQUEST_TIMEOUT;
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]);

  let body: BodyInit | undefined;
  const additionalHeaders: Record<string, string> = {};

  if (config.body !== undefined) {
    if (isBodyInit(config.body)) {
      body = config.body;
    } else {
      // For plain objects, serialize as JSON
      body = JSON.stringify(config.body);
      additionalHeaders['Content-Type'] = 'application/json';
    }
  }

  return {
    ...config,
    body,
    headers: mergeHeaders(context?.headers, config.headers, additionalHeaders),
    signal,
  };
}

/**
 * Converts HeadersInit to a plain object.
 */
function headersToObject(headers: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key] = value;
    }
  } else {
    for (const [key, value] of Object.entries(headers)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Merges context, config, and additional headers.
 * Properly handles HeadersInit types (Headers object, array, or plain object).
 */
function mergeHeaders(
  contextHeaders?: Record<string, string | undefined>,
  configHeaders?: HeadersInit,
  additionalHeaders?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  // Add context headers (filter out undefined)
  if (contextHeaders) {
    for (const [key, value] of Object.entries(contextHeaders)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  // Add config headers
  if (configHeaders) {
    Object.assign(result, headersToObject(configHeaders));
  }

  // Add additional headers (like auto-generated Content-Type)
  if (additionalHeaders) {
    Object.assign(result, additionalHeaders);
  }

  return result;
}

/**
 * Builds a URL with query parameters.
 */
export function buildUrl(baseUrl: string, params?: RequestParams): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Creates a fetch service with pre-configured context.
 */
export function createHttpClient(context: ContextProps = { url: '' }) {
  const createMethodHandler = (method: string) => {
    return <T>(url: string, config: RequestConfig = {}): Promise<RequestResponse<T>> => {
      return makeRequest<T>(url, { ...config, method }, context);
    };
  };

  return {
    /**
     * Cleans up expired cache entries.
     * Returns the number of entries removed.
     */
    cleanupCache(): number {
      const now = Date.now();
      const expiredKeys = Array.from(HttpCache.entries())
        .filter(([, value]) => now > value.expiresIn)
        .map(([key]) => key);

      for (const key of expiredKeys) {
        HttpCache.delete(key);
      }

      return expiredKeys.length;
    },

    /**
     * Clears all cached requests.
     */
    clearCache(): void {
      HttpCache.clear();
    },
    delete: createMethodHandler('DELETE'),
    get: createMethodHandler('GET'),

    /**
     * Returns the number of cached requests.
     */
    getCacheSize(): number {
      return HttpCache.size;
    },

    /**
     * Invalidates a specific cache entry by id or URL.
     */
    invalidateCache(idOrUrl: string): boolean {
      return HttpCache.delete(idOrUrl);
    },
    patch: createMethodHandler('PATCH'),
    post: createMethodHandler('POST'),
    put: createMethodHandler('PUT'),

    /**
     * Updates the service headers.
     * Headers with undefined values will be removed.
     */
    setHeaders(payload: Record<string, string | undefined>): void {
      context.headers = Object.fromEntries(
        Object.entries({ ...context.headers, ...payload }).filter(([, value]) => value !== undefined),
      );
    },
  };
}
