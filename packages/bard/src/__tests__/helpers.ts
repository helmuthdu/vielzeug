import { createBard } from '../bard';
import { FakeAudioContext, FakeGainNode, FakeMediaElement, FakeMediaSession } from '../testing';
import type { Bard, BardEvent, BardOptions } from '../types';

/** Minimal `window`/`document` stand-in that records listener attach/detach. */
export class GlobalTarget {
  readonly listeners: Array<{ type: string; listener: () => void }> = [];
  hidden = false;

  addEventListener(type: string, listener: () => void): void {
    this.listeners.push({ listener, type });
  }
  removeEventListener(type: string, listener: () => void): void {
    const index = this.listeners.findIndex((entry) => entry.type === type && entry.listener === listener);
    if (index >= 0) this.listeners.splice(index, 1);
  }
  count(type?: string): number {
    return type === undefined ? this.listeners.length : this.listeners.filter((l) => l.type === type).length;
  }
  dispatch(type: string): void {
    for (const entry of [...this.listeners]) {
      if (entry.type === type) entry.listener();
    }
  }
}

export interface Harness {
  readonly bard: Bard;
  readonly ctx: FakeAudioContext;
  readonly doc: GlobalTarget & { createElement: (tag: string) => FakeMediaElement };
  readonly elements: FakeMediaElement[];
  readonly events: BardEvent[];
  readonly win: GlobalTarget;
}

/** Installs window/document/fetch stubs and a bard wired to a fake context. */
export function createHarness(options: Partial<BardOptions> = {}): Harness {
  const ctx = new FakeAudioContext();
  const win = new GlobalTarget();
  const elements: FakeMediaElement[] = [];
  const doc = Object.assign(new GlobalTarget(), {
    createElement(_tag: string): FakeMediaElement {
      const element = new FakeMediaElement(ctx);
      elements.push(element);
      return element;
    },
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string | URL, fetchOptions?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          const signal = fetchOptions?.signal;
          const onAbort = (): void => reject(new Error('aborted'));
          if (signal?.aborted) reject(new Error('aborted'));
          signal?.addEventListener('abort', onAbort, { once: true });
          void url;
          queueMicrotask(() => {
            signal?.removeEventListener('abort', onAbort);
            if (!signal?.aborted) resolve({ arrayBuffer: async () => new ArrayBuffer(8), ok: true, status: 200 });
          });
        }),
    ),
  );
  const bard = createBard({ context: () => ctx, ...options });
  const events: BardEvent[] = [];
  bard.tap((event) => events.push(event));
  return { bard, ctx, doc, elements, events, win };
}

/** Stub for `navigator.mediaSession` plus the `MediaMetadata` constructor. */
export function installMediaSession(): FakeMediaSession {
  const session = new FakeMediaSession();
  vi.stubGlobal('navigator', { mediaSession: session });
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(init: unknown) {
        void init;
      }
    },
  );
  return session;
}

/** All gain nodes created so far, in creation order. */
export function gains(ctx: FakeAudioContext): FakeGainNode[] {
  return ctx.nodes.filter((node): node is FakeGainNode => node instanceof FakeGainNode);
}
