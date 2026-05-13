/** Response parsing strategy. 'raw' returns the Response object directly. */
export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';

export async function parseResponse(
  res: Response,
  responseType: ResponseType = 'auto',
  opts?: { throwOnUnknownContentType?: boolean },
): Promise<unknown> {
  if (responseType === 'raw') return res;

  if (res.status === 204 || res.status === 205 || res.status === 304) return;

  if (responseType === 'json') return res.json();

  if (responseType === 'text') return res.text();

  if (responseType === 'blob') return res.blob();

  if (responseType === 'arrayBuffer') return res.arrayBuffer();

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json') || contentType.includes('+json')) return res.json();

  if (contentType.startsWith('text/')) return res.text();

  if (opts?.throwOnUnknownContentType ?? true) {
    throw new TypeError(`[fetchit] Unsupported response content-type '${contentType || 'unknown'}'`);
  }

  return res.blob();
}
