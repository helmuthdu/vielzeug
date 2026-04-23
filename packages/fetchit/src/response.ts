export const CONTENT_TYPE_JSON = 'application/json';
export const HEADER_CONTENT_TYPE = 'content-type';

export async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205 || res.status === 304) return;

  const contentType = res.headers.get(HEADER_CONTENT_TYPE) ?? '';

  if (contentType.includes(CONTENT_TYPE_JSON) || contentType.includes('+json')) return res.json();

  if (contentType.startsWith('text/')) return res.text();

  return res.blob();
}
