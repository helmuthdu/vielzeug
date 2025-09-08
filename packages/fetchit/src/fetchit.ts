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

function getCacheKey(url: string, config: RequestConfig) {
  return config.id ?? JSON.stringify({ url, ...config });
}

function log(type: 'SUCCESS' | 'ERROR', url: string, req: RequestInit, res: unknown, time: number) {
  const elapsed = Date.now() - time;
  const logType = type.toLowerCase() as 'success' | 'error';

  const logUrl = url
    .replace(/^https?:\/\//, '')
    .split('/')
    .slice(1)
    .join('/');

  Logit[logType](`HTTP::${req.method?.toUpperCase()}(…/${logUrl}) ${type === 'SUCCESS' ? '✓' : '✕'} ${elapsed}ms`, {
    req,
    res,
    url,
  });
}

async function fetcher<T>(
  url: string,
  config: RequestInit,
  { id, retries = 2 }: { id?: string; retries?: number },
): Promise<RequestResponse<T>> {
  const time = Date.now();
  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') ?? '';

    let data: T;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text')) {
      data = (await response.text()) as T;
    } else {
      data = (await response.blob()) as T;
    }

    log('SUCCESS', url, config, data, time);

    if (id) HttpCache.get(id)!.status = RequestStatus.SUCCESS;

    return { data, ok: response.ok, status: response.status };
  } catch (error) {
    log('ERROR', url, config, error, time);

    if (id) HttpCache.get(id)!.status = RequestStatus.ERROR;

    if (retries > 0 && error instanceof TypeError) {
      return fetcher(url, config, { id, retries: retries - 1 });
    }

    throw error;
  } finally {
    if (id && config.method !== 'GET') {
      HttpCache.delete(id);
    }
  }
}

async function makeRequest<T>(url: string, config: RequestConfig, context?: ContextProps): Promise<RequestResponse<T>> {
  const key = getCacheKey(url, config);
  let cached = HttpCache.get(key) as RequestData<T> | undefined;

  if (
    config.invalidate ||
    (config.cancelable && cached?.status === RequestStatus.PENDING) ||
    cached?.status === RequestStatus.ERROR
  ) {
    cached?.controller.abort('Request aborted');
    HttpCache.delete(key);
    cached = undefined;
  }

  if (cached && Date.now() <= cached.expiresIn) {
    return cached.request;
  }

  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(context?.timeout ?? REQUEST_TIMEOUT)]);
  const request = fetcher<T>(
    context?.url ? `${context.url}/${url}` : url,
    {
      ...config,
      body: config.body ? JSON.stringify(config.body) : undefined,
      headers: { ...(context?.headers ?? {}), ...(config.headers ?? {}) } as { [x: string]: string },
      signal,
    },
    { id: key },
  );

  HttpCache.set(key, {
    controller,
    expiresIn: Date.now() + (context?.expiresIn ?? CACHE_EXPIRES_IN),
    request,
    status: RequestStatus.PENDING,
  });

  return request;
}

export function buildUrl(baseUrl: string, params?: RequestParams): string {
  const url = new URL(baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

export function createFetchService(context: ContextProps = { url: '' }) {
  const makeMethodRequest =
    (method: string) =>
    <T>(url: string, config: RequestConfig = {}): Promise<RequestResponse<T>> =>
      makeRequest<T>(url, { ...config, method }, context);

  return {
    delete: makeMethodRequest('DELETE'),
    get: makeMethodRequest('GET'),
    patch: makeMethodRequest('PATCH'),
    post: makeMethodRequest('POST'),
    put: makeMethodRequest('PUT'),
    setHeaders(payload: Record<string, string | undefined>) {
      context.headers = { ...(context.headers ?? {}), ...payload };
      Object.keys(context.headers).forEach(
        (key) => context.headers![key] === undefined && delete context.headers![key],
      );
    },
  };
}
