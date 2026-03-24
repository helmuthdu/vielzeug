import { vi } from 'vitest';

const blobStore = new Map<string, Blob>();
let blobId = 0;

globalThis.window.URL.createObjectURL = vi.fn((blob: Blob) => {
  const id = `blob:workit-test-${++blobId}`;

  blobStore.set(id, blob);

  return id;
});

globalThis.window.URL.revokeObjectURL = vi.fn((url: string) => {
  blobStore.delete(url);
});

class WorkerMock {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly #init: Promise<void>;
  #innerOnMessage: ((event: MessageEvent<{ id: number; input: unknown }>) => void | Promise<void>) | null = null;
  #terminated = false;

  constructor(url: string) {
    const blob = blobStore.get(url);

    if (!blob) throw new Error(`Unknown worker script URL: ${url}`);

    this.#init = blob.text().then((script) => {
      const selfScope = {
        onmessage: null as ((event: MessageEvent<{ id: number; input: unknown }>) => void | Promise<void>) | null,
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

  postMessage(data: { id: number; input: unknown }, _transfer?: Transferable[]): void {
    void this.#init.then(async () => {
      if (this.#terminated || !this.#innerOnMessage) return;

      try {
        await this.#innerOnMessage({ data } as MessageEvent<{ id: number; input: unknown }>);
      } catch (error) {
        this.onerror?.({ message: error instanceof Error ? error.message : String(error) } as ErrorEvent);
      }
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
