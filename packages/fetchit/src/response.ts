export async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205 || res.status === 304) return;

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json') || contentType.includes('+json')) return res.json();

  if (contentType.startsWith('text/')) return res.text();

  return res.blob();
}
