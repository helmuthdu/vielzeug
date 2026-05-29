/** Response parsing strategy. 'raw' returns the Response object directly. */
export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';

export async function parseResponse(res: Response, responseType: ResponseType = 'auto'): Promise<unknown> {
  if (responseType === 'raw') return res;

  if (res.status === 204 || res.status === 205 || res.status === 304) return;

  if (responseType === 'json') return res.json();

  if (responseType === 'text') return res.text();

  if (responseType === 'blob') return res.blob();

  if (responseType === 'arrayBuffer') return res.arrayBuffer();

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json') || contentType.includes('+json')) return res.json();

  if (contentType.startsWith('text/')) return res.text();

  if (contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/')) {
    return res.blob();
  }

  throw new TypeError(`[courier] Unsupported response content-type '${contentType || 'unknown'}'`);
}
