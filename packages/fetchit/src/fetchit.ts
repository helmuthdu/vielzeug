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

type RequestData<T> = {
  controller: AbortController;
  expiresIn: number;
  request: Promise<RequestResponse<T>>;
  status: (typeof RequestStatus)[keyof typeof RequestStatus];
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
  return url
    .replace(/^https?:\/\//, '')
    .split('/')
    .slice(1)
    .join('/');
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

    throw error;
  } finally {
    // Clean up non-GET requests from cache
    if (id && config.method !== 'GET') {
      HttpCache.delete(id);
    }
  }
}

/**
 * Parses response based on content type.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text')) {
    return response.text() as Promise<T>;
  }

  return response.blob() as Promise<T>;
}

/**
 * Updates cache entry status if it exists.
 */
function updateCacheStatus(id: string | undefined, status: (typeof RequestStatus)[keyof typeof RequestStatus]): void {
  if (id) {
    const cached = HttpCache.get(id);
    if (cached) {
      cached.status = status;
    }
  }
}

/**
 * Makes an HTTP request with caching and cancellation support.
 */
async function makeRequest<T>(url: string, config: RequestConfig, context?: ContextProps): Promise<RequestResponse<T>> {
  const key = getCacheKey(url, config);
  let cached = HttpCache.get(key) as RequestData<T> | undefined;

  // Handle cache invalidation
  if (shouldInvalidateCache(config, cached)) {
    invalidateCacheEntry(key, cached);
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

  // Store in cache
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

  if (config.cancelable && cached.status === RequestStatus.PENDING) return true;

  return cached.status === RequestStatus.ERROR;
}

/**
 * Invalidates a cache entry by aborting and deleting it.
 */
function invalidateCacheEntry<T>(key: string, cached: RequestData<T> | undefined): void {
  if (cached) {
    cached.controller.abort('Request aborted');
    HttpCache.delete(key);
  }
}

/**
 * Checks if a cache entry is still valid.
 */
function isCacheValid<T>(cached: RequestData<T>): boolean {
  return Date.now() <= cached.expiresIn;
}

/**
 * Builds the full URL with a context path.
 */
function buildFullUrl(url: string, context?: ContextProps): string {
  return context?.url ? `${context.url}/${url}` : url;
}

/**
 * Builds the request configuration with merged headers and signal.
 */
function buildRequestConfig(
  config: RequestConfig,
  context: ContextProps | undefined,
  controller: AbortController,
): RequestInit {
  const timeout = context?.timeout ?? REQUEST_TIMEOUT;
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]);

  return {
    ...config,
    body: config.body ? JSON.stringify(config.body) : undefined,
    headers: mergeHeaders(context?.headers, config.headers),
    signal,
  };
}

/**
 * Merges context and config headers.
 */
function mergeHeaders(
  contextHeaders?: Record<string, string | undefined>,
  configHeaders?: HeadersInit,
): Record<string, string> {
  return {
    ...(contextHeaders ?? {}),
    ...(configHeaders ?? {}),
  } as Record<string, string>;
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
export function createFetchService(context: ContextProps = { url: '' }) {
  const createMethodHandler = (method: string) => {
    return <T>(url: string, config: RequestConfig = {}): Promise<RequestResponse<T>> => {
      return makeRequest<T>(url, { ...config, method }, context);
    };
  };

  return {
    delete: createMethodHandler('DELETE'),
    get: createMethodHandler('GET'),
    patch: createMethodHandler('PATCH'),
    post: createMethodHandler('POST'),
    put: createMethodHandler('PUT'),

    /**
     * Updates the service headers, removing any with undefined values.
     */
    setHeaders(payload: Record<string, string | undefined>): void {
      context.headers = { ...context.headers, ...payload };

      // Remove undefined headers
      for (const key in context.headers) {
        if (context.headers[key] === undefined) {
          delete context.headers[key];
        }
      }
    },
  };
}
