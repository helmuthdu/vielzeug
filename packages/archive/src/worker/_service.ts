/** Bound the complete service exchange, including response-body decoding. */
export async function serviceRequest<T>(
  binding: { fetch(request: Request): Promise<Response> },
  request: Request,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      binding.fetch(new Request(request, { signal: controller.signal })).then(consume),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Service request timed out.'));
        }, 5000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
