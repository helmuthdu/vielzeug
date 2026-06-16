/**
 * Host↔worker message protocol helpers for module worker files.
 *
 * Import this sub-path in module worker files to implement the protocol
 * without manual boilerplate.
 *
 * @example
 * // my-worker.ts
 * import { handleMessages } from '@vielzeug/familiar/protocol';
 * handleMessages(async (input: number) => input * 2);
 */

/**
 * Current host↔worker message protocol version.
 * Increment when the protocol changes in a breaking way.
 * The host does not validate this value at runtime — it is a debugging convention only.
 * @internal
 */
export const PROTOCOL_VERSION = 2 as const;

type ProtocolMessage<TInput> = { id: number; input: TInput };

type ErrorPayload = { message: string; name: string; stack?: string };

/**
 * Sets up the `self.onmessage` handler for a module worker.
 * Handles the `{ id, input }` → `{ id, result }` / `{ id, error }` protocol automatically.
 *
 * Errors from `fn` are caught and forwarded as structured `{ id, error }` messages so the
 * host can reconstruct them as `WorkerTaskError`. Non-Error throws are wrapped in an Error.
 *
 * @example
 * // my-worker.ts
 * import { handleMessages } from '@vielzeug/familiar/protocol';
 *
 * handleMessages(async (input: { a: number; b: number }) => input.a + input.b);
 */
export function handleMessages<TInput, TOutput>(fn: (input: TInput) => TOutput | Promise<TOutput>): void {
  (self as unknown as { onmessage: (event: MessageEvent<ProtocolMessage<TInput>>) => void }).onmessage = async (
    event,
  ) => {
    const { id, input } = event.data;

    try {
      const result = await fn(input);

      (self as unknown as { postMessage: (data: unknown) => void }).postMessage({ id, result });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const error: ErrorPayload = { message: err.message, name: err.name, stack: err.stack };

      (self as unknown as { postMessage: (data: unknown) => void }).postMessage({ error, id });
    }
  };
}

type StreamProtocolMessage<TInput> = { id: number; input: TInput; stream: true };

/**
 * Sets up the `self.onmessage` handler for a streaming module worker.
 * The task function must return an `AsyncIterable<TOutput>`; each yielded value is forwarded
 * as a `{ id, chunk }` message, followed by `{ id, result: undefined }` on completion.
 *
 * Mirrors the inline blob worker streaming protocol so `runStream()` works with module workers.
 * Errors are forwarded as `{ id, error }` messages.
 *
 * @example
 * // my-streaming-worker.ts
 * import { handleStreamMessages } from '@vielzeug/familiar/protocol';
 *
 * handleStreamMessages(async function* (n: number) {
 *   for (let i = 0; i < n; i++) {
 *     yield i;
 *   }
 * });
 */
export function handleStreamMessages<TInput, TOutput>(
  fn: (input: TInput) => AsyncIterable<TOutput> | Promise<AsyncIterable<TOutput>>,
): void {
  const _self = self as unknown as {
    onmessage: (event: MessageEvent<StreamProtocolMessage<TInput>>) => void;
    postMessage: (data: unknown) => void;
  };

  _self.onmessage = async (event) => {
    const { id, input } = event.data;

    try {
      const iterable = await fn(input);

      for await (const chunk of iterable) {
        _self.postMessage({ chunk, id });
      }

      _self.postMessage({ id, result: undefined });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const error: ErrorPayload = { message: err.message, name: err.name, stack: err.stack };

      _self.postMessage({ error, id });
    }
  };
}
