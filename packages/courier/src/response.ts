import { abortError } from '@vielzeug/arsenal';

import { CourierParseError } from './errors.js';

/** Response parsing strategy. 'raw' returns the Response object directly. */
export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw';

async function parseJson(res: Response): Promise<unknown> {
  const text = (await res.text()).trim();

  return text ? JSON.parse(text) : undefined;
}

export function trackRawResponse(response: Response, signal: AbortSignal | undefined, onDone: () => void): Response {
  if (!response.body) {
    onDone();
    return response;
  }

  if (response.body.locked) throw new CourierParseError('Raw response body is already locked');

  const reader = response.body.getReader();
  let settled = false;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  const finish = (): void => {
    if (settled) return;
    settled = true;
    signal?.removeEventListener('abort', abort);
    onDone();
  };
  const abort = (): void => {
    const reason = abortError(signal, 'The operation was aborted.');
    try {
      streamController?.error(reason);
    } catch {}
    finish();
    void reader.cancel(reason).catch(() => undefined);
  };
  const body = new ReadableStream<Uint8Array>({
    cancel: async (reason) => {
      try {
        await reader.cancel(reason);
      } finally {
        finish();
      }
    },
    pull: async (controller) => {
      try {
        const chunk = await reader.read();
        if (settled) return;
        if (chunk.done) {
          controller.close();
          finish();
        } else {
          controller.enqueue(chunk.value);
        }
      } catch (error) {
        if (!settled) controller.error(error);
        finish();
      }
    },
    start: (controller) => {
      streamController = controller;
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    },
  });
  const tracked = new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });

  return preserveMetadata(tracked, response);
}

function preserveMetadata(target: Response, source: Response): Response {
  const clone = target.clone.bind(target);

  Object.defineProperties(target, {
    clone: { value: () => preserveMetadata(clone(), source) },
    redirected: { value: source.redirected },
    type: { value: source.type },
    url: { value: source.url },
  });

  return target;
}

export async function parseResponse(res: Response, responseType: ResponseType = 'auto'): Promise<unknown> {
  if (responseType === 'raw') return res;

  if (res.status === 204 || res.status === 205) return;

  if (responseType === 'json') return parseJson(res);

  if (responseType === 'text') return res.text();

  if (responseType === 'blob') return res.blob();

  if (responseType === 'arrayBuffer') return res.arrayBuffer();

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json') || contentType.includes('+json')) return parseJson(res);

  if (contentType.startsWith('text/')) return res.text();

  if (contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/')) {
    return res.blob();
  }

  // Unknown content-type — fall back to text, which is always safe to read and debug.
  return res.text();
}
