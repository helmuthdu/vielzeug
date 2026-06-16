/**
 * Converts an `AsyncIterable<T>` into a Web Standard `ReadableStream<T>`.
 *
 * Use this with `db.watch()` when you need a `ReadableStream` instead of an async iterator —
 * for example, to `pipeTo()` a `WritableStream` or `pipeThrough()` a `TransformStream`.
 *
 * ```ts
 * const stream = toReadableStream(db.watch('users'));
 * await stream.pipeTo(new WritableStream({ write: (users) => render(users) }));
 * ```
 *
 * The stream closes when the iterable is exhausted or when the stream is cancelled.
 * Pass an `AbortSignal` to `db.watch()` to cancel from outside:
 *
 * ```ts
 * const controller = new AbortController();
 * const stream = toReadableStream(db.watch('users', { signal: controller.signal }));
 * controller.abort(); // closes the stream
 * ```
 */
export function toReadableStream<T>(iterable: AsyncIterable<T>): ReadableStream<T> {
  const iter = iterable[Symbol.asyncIterator]();

  return new ReadableStream<T>({
    async cancel() {
      await iter.return?.();
    },
    async pull(controller) {
      try {
        const { done, value } = await iter.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
