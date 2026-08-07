/** Current host-to-worker protocol version. */
export const PROTOCOL_VERSION = 1 as const;

export type SerializedError = {
  message: string;
  name: string;
  stack?: string;
};

export type WorkerRequest<TInput> =
  | { id: number; input: TInput; kind: 'run'; version: typeof PROTOCOL_VERSION }
  | { id: number; input: TInput; kind: 'stream'; version: typeof PROTOCOL_VERSION };

export type WorkerResponse<TOutput> =
  | { id: number; kind: 'chunk'; value: TOutput; version: typeof PROTOCOL_VERSION }
  | { error: SerializedError; id: number; kind: 'error'; version: typeof PROTOCOL_VERSION }
  | { id: number; kind: 'result'; value: TOutput; version: typeof PROTOCOL_VERSION };

export type TaskHandler<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;

export type StreamHandler<TInput, TChunk> = (input: TInput) => AsyncIterable<TChunk> | Promise<AsyncIterable<TChunk>>;

function serializeError(error: unknown): SerializedError {
  const value = error instanceof Error ? error : new Error(String(error));

  return { message: value.message, name: value.name, stack: value.stack };
}

function isRequest(value: unknown): value is WorkerRequest<unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const request = value as Partial<WorkerRequest<unknown>>;

  return typeof request.id === 'number' && (request.kind === 'run' || request.kind === 'stream') && 'input' in request;
}

function post<TOutput>(message: WorkerResponse<TOutput>): void {
  (self as unknown as { postMessage(data: WorkerResponse<TOutput>): void }).postMessage(message);
}

function postError(id: number, error: unknown): void {
  post({ error: serializeError(error), id, kind: 'error', version: PROTOCOL_VERSION });
}

/** Register a module worker that handles one request and returns one result. */
export function exposeTask<TInput, TOutput>(handler: TaskHandler<TInput, TOutput>): void {
  (self as unknown as { onmessage: (event: MessageEvent<unknown>) => void }).onmessage = async (event) => {
    if (!isRequest(event.data) || event.data.version !== PROTOCOL_VERSION || event.data.kind !== 'run') return;

    const { id, input } = event.data;

    try {
      const value = await handler(input as TInput);

      post({ id, kind: 'result', value, version: PROTOCOL_VERSION });
    } catch (error) {
      postError(id, error);
    }
  };
}

/** Register a module worker that yields chunks for each request. */
export function exposeStream<TInput, TChunk>(handler: StreamHandler<TInput, TChunk>): void {
  (self as unknown as { onmessage: (event: MessageEvent<unknown>) => void }).onmessage = async (event) => {
    if (!isRequest(event.data) || event.data.version !== PROTOCOL_VERSION || event.data.kind !== 'stream') return;

    const { id, input } = event.data;

    try {
      for await (const value of await handler(input as TInput)) {
        post({ id, kind: 'chunk', value, version: PROTOCOL_VERSION });
      }

      post({ id, kind: 'result', value: undefined as never, version: PROTOCOL_VERSION });
    } catch (error) {
      postError(id, error);
    }
  };
}
