import { vi } from 'vitest';

const blobStore = new Map<string, Blob>();
let blobId = 0;

globalThis.window.URL.createObjectURL = vi.fn((blob: Blob) => {
  const id = `blob:worker-test-${++blobId}`;

  blobStore.set(id, blob);

  return id;
});

globalThis.window.URL.revokeObjectURL = vi.fn((url: string) => {
  blobStore.delete(url);
});

// WorkerMock supports three message types from the generated worker script (R9):
//   1. Standard request/response:  host→worker { id, input }  →  worker→host { id, result } or { id, error }
//   2. Streaming chunks:           host→worker { id, input, stream: true }  →  worker→host { id, chunk }* + { id, result: undefined }
//   3. Heartbeat:                  host→worker { id, input, heartbeatInterval }  →  worker→host { id, heartbeat: true }* (auto-sent at the interval)
class WorkerMock {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly #init: Promise<void>;
  #innerOnMessage: ((event: MessageEvent<{ input: unknown }>) => void | Promise<void>) | null = null;
  #terminated = false;

  constructor(url: string) {
    const blob = blobStore.get(url);

    if (!blob) throw new Error(`Unknown worker script URL: ${url}`);

    this.#init = blob.text().then((script) => {
      const selfScope = {
        onmessage: null as ((event: MessageEvent<{ input: unknown }>) => void | Promise<void>) | null,
        postMessage: (data: unknown) => {
          if (this.#terminated) return;

          this.onmessage?.({ data } as MessageEvent<unknown>);
        },
      };

      // Execute the generated worker script in an isolated scope.
      new Function('self', 'importScripts', script)(selfScope, () => {});
      this.#innerOnMessage = selfScope.onmessage;
    });
  }

  postMessage(data: { input: unknown }, _transfer?: Transferable[] | StructuredSerializeOptions): void {
    // Simulate structured-clone semantics so tests catch non-cloneable inputs and
    // mutation-after-send bugs that would fail in production.
    const cloned = structuredClone(data);

    void this.#init
      .then(async () => {
        if (this.#terminated || !this.#innerOnMessage) return;

        try {
          await this.#innerOnMessage({ data: cloned } as MessageEvent<{ input: unknown }>);
        } catch (error) {
          this.onerror?.({ message: error instanceof Error ? error.message : String(error) } as ErrorEvent);
        }
      })
      .catch((error) => {
        this.onerror?.({ message: error instanceof Error ? error.message : String(error) } as ErrorEvent);
      });
  }

  terminate(): void {
    this.#terminated = true;
  }
}

Object.defineProperty(globalThis, 'Worker', {
  configurable: true,
  value: WorkerMock,
  writable: true,
});
