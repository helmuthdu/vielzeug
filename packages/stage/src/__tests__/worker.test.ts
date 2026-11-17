import { describe, expect, test, vi } from 'vitest';
import { StageDisposedError, StageError, StageUnsupportedError } from '../errors.js';
import type { WorkerScope } from '../worker/main.js';
import { createWorkerStage } from '../worker/main.js';
import type { StageWorkerCommand, StageWorkerEvent, StageWorkerInit } from '../worker/protocol.js';
import { STAGE_WORKER_PROTOCOL } from '../worker/protocol.js';
import type { ServeStageSetup, WorkerSelfScope } from '../worker/serve.js';
import { serveStage } from '../worker/serve.js';

/** In-memory linked pair emulating a main-thread Worker scope and a worker self scope. */
function createFakePair(): { main: WorkerScope; self: WorkerSelfScope; posted: unknown[] } {
  const mainListeners = new Set<(event: { data: unknown }) => void>();
  const selfListeners = new Set<(event: { data: unknown }) => void>();
  const posted: unknown[] = [];
  const deliver = (listeners: Set<(event: { data: unknown }) => void>, data: unknown) => {
    for (const listener of [...listeners]) listener({ data });
  };
  return {
    main: {
      addEventListener: (_type, listener) => mainListeners.add(listener),
      postMessage: (message) => {
        posted.push(message);
        // Deliver synchronously so tests can assert handling without flushing.
        deliver(selfListeners, message);
      },
      removeEventListener: (_type, listener) => mainListeners.delete(listener),
    },
    posted,
    self: {
      addEventListener: (_type, listener) => selfListeners.add(listener),
      postMessage: (message) => {
        deliver(mainListeners, message);
      },
    },
  };
}

function fakeCanvas(): HTMLCanvasElement {
  const offscreen = { convertToBlob: undefined, height: 0, width: 0 };
  return {
    getContext: () => null,
    height: 0,
    transferControlToOffscreen: () => offscreen,
    width: 0,
  } as unknown as HTMLCanvasElement;
}

describe('createWorkerStage', () => {
  test('transfers the canvas once in the init message', () => {
    const pair = createFakePair();
    const canvas = fakeCanvas();
    const stage = createWorkerStage(canvas, pair.main, { height: 200, layers: [{ id: 'a' }], width: 400 });
    const init = pair.posted[0] as StageWorkerInit;
    expect(init.type).toBe('init');
    expect(init.protocol).toBe(STAGE_WORKER_PROTOCOL);
    expect(init.layers).toEqual([{ id: 'a' }]);
    expect(pair.posted).toHaveLength(1);
    stage.dispose();
  });

  test('throws StageUnsupportedError when the canvas cannot transfer', () => {
    const pair = createFakePair();
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => createWorkerStage(canvas, pair.main, { height: 1, layers: [], width: 1 })).toThrow(
      StageUnsupportedError,
    );
  });

  test('forwards resize, matrix, invalidate, and scene commands', () => {
    const pair = createFakePair();
    const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
    pair.posted.length = 0;
    stage.resize({ height: 20, width: 30 }, 2);
    stage.setTransform([2, 0, 0, 2, 5, 5]);
    stage.invalidate('bg');
    stage.sendScene({ id: 'hero', kind: 'move' });
    const types = pair.posted.map((m) => (m as StageWorkerCommand).type);
    expect(types).toEqual(['resize', 'matrix', 'invalidate', 'scene']);
    const resize = pair.posted[0] as Extract<StageWorkerCommand, { type: 'resize' }>;
    expect(resize).toMatchObject({ dpr: 2, height: 20, protocol: STAGE_WORKER_PROTOCOL, width: 30 });
    const scene = pair.posted[3] as Extract<StageWorkerCommand, { type: 'scene' }>;
    expect(scene.scene).toEqual({ id: 'hero', kind: 'move' });
    stage.dispose();
  });

  test('ready resolves when the worker posts ready', async () => {
    const pair = createFakePair();
    const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
    pair.self.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'ready' });
    await expect(stage.ready).resolves.toBeUndefined();
    stage.dispose();
  });

  test('toBlob resolves with the correlated blob', async () => {
    const pair = createFakePair();
    const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
    const blob = new Blob(['png']);
    // Respond to the blob command with the same id.
    const originalPost = pair.main.postMessage;
    pair.main.postMessage = (message: unknown, transfer?: Transferable[]) => {
      originalPost(message, transfer);
      const msg = message as StageWorkerCommand;
      if (msg.type === 'blob') {
        pair.self.postMessage({ blob, id: msg.id, ok: true, protocol: STAGE_WORKER_PROTOCOL, type: 'blob' });
      }
    };
    await expect(stage.toBlob({ type: 'image/png' })).resolves.toBe(blob);
    stage.dispose();
  });

  test('toBlob maps worker failure kinds to typed errors', async () => {
    const pair = createFakePair();
    const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
    const originalPost = pair.main.postMessage;
    const respond = (kind?: string) => {
      pair.main.postMessage = (message: unknown, transfer?: Transferable[]) => {
        originalPost(message, transfer);
        const msg = message as StageWorkerCommand;
        if (msg.type === 'blob') {
          pair.self.postMessage({
            error: 'convertToBlob failed',
            id: msg.id,
            ...(kind === undefined ? {} : { kind }),
            ok: false,
            protocol: STAGE_WORKER_PROTOCOL,
            type: 'blob',
          });
        }
      };
    };
    respond('unsupported');
    await expect(stage.toBlob()).rejects.toThrow(StageUnsupportedError);
    respond('disposed');
    await expect(stage.toBlob()).rejects.toThrow(StageDisposedError);
    respond(undefined);
    await expect(stage.toBlob()).rejects.toThrow(StageError);
    stage.dispose();
  });

  test('dispose rejects pending blob requests with StageDisposedError', async () => {
    const pair = createFakePair();
    const removeEventListener = vi.fn(pair.main.removeEventListener);
    const scope: WorkerScope = { ...pair.main, removeEventListener };
    const stage = createWorkerStage(fakeCanvas(), scope, { height: 10, layers: [], width: 10 });
    const pending = stage.toBlob();
    stage.dispose();
    await expect(pending).rejects.toThrow(StageDisposedError);
    const last = pair.posted[pair.posted.length - 1] as StageWorkerCommand;
    expect(last.type).toBe('dispose');
    expect(removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  test('commands after dispose are not posted', () => {
    const pair = createFakePair();
    const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
    stage.dispose();
    pair.posted.length = 0;
    stage.invalidate();
    stage.setTransform([1, 0, 0, 1, 0, 0]);
    stage.sendScene(1);
    expect(pair.posted).toHaveLength(0);
    expect(stage.disposed).toBe(true);
    expect(stage.disposalSignal.aborted).toBe(true);
  });

  test('protocol mismatch on worker messages is ignored with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const pair = createFakePair();
      const stage = createWorkerStage(fakeCanvas(), pair.main, { height: 10, layers: [], width: 10 });
      pair.self.postMessage({ protocol: 999, type: 'ready' });
      await Promise.resolve();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('protocol'));
      pair.self.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'ready' });
      await expect(stage.ready).resolves.toBeUndefined();
      stage.dispose();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('serveStage', () => {
  function serve(setup: () => ServeStageSetup) {
    const pair = createFakePair();
    const server = serveStage(pair.self, setup);
    return { pair, server };
  }

  function initMessage(overrides: Partial<StageWorkerInit> = {}): StageWorkerInit {
    return {
      background: null,
      canvas: fakeCanvas() as unknown as OffscreenCanvas,
      dpr: 1,
      height: 10,
      layers: [{ id: 'a' }],
      protocol: STAGE_WORKER_PROTOCOL,
      type: 'init',
      width: 10,
      ...overrides,
    };
  }

  test('init creates the stage and posts ready', async () => {
    const onStart = vi.fn();
    const { pair, server } = serve(() => ({ layers: [], onStart }));
    const events: StageWorkerEvent[] = [];
    pair.main.addEventListener('message', (event) => events.push(event.data as StageWorkerEvent));
    pair.main.postMessage(initMessage());
    await new Promise((r) => setTimeout(r, 0));
    expect(events.some((m) => m.type === 'ready' && m.protocol === STAGE_WORKER_PROTOCOL)).toBe(true);
    expect(onStart).toHaveBeenCalledOnce();
    expect(server.stage).toBeDefined();
    server.dispose();
  });

  test('blob before init responds with ok:false', async () => {
    const { pair, server } = serve(() => ({ layers: [] }));
    const responses: StageWorkerEvent[] = [];
    pair.main.addEventListener('message', (event) => responses.push(event.data as StageWorkerEvent));
    pair.main.postMessage({ id: 1, protocol: STAGE_WORKER_PROTOCOL, type: 'blob' });
    await new Promise((r) => setTimeout(r, 0));
    const msg = responses.find((m) => m.type === 'blob');
    expect(msg?.type === 'blob' && msg.ok === false && msg.id === 1).toBe(true);
    server.dispose();
  });

  test('scene messages reach onScene and invalidate', async () => {
    const onScene = vi.fn();
    const { pair, server } = serve(() => ({ layers: [], onScene }));
    pair.main.postMessage(initMessage());
    await Promise.resolve();
    pair.main.postMessage({ protocol: STAGE_WORKER_PROTOCOL, scene: { hello: 1 }, type: 'scene' });
    expect(onScene).toHaveBeenCalledWith({ scene: { hello: 1 } });
    server.dispose();
  });

  test('dispose command disposes the stage and calls onDispose', async () => {
    const onDispose = vi.fn();
    const { pair, server } = serve(() => ({ layers: [], onDispose }));
    pair.main.postMessage(initMessage());
    await Promise.resolve();
    const stage = server.stage;
    expect(stage).toBeDefined();
    pair.main.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'dispose' });
    expect(onDispose).toHaveBeenCalledOnce();
    expect(server.stage).toBeUndefined();
    server.dispose();
  });

  test('unknown command types warn and are ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { pair, server } = serve(() => ({ layers: [] }));
      pair.main.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'nonsense' });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('nonsense'));
      server.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  test('protocol mismatch on main messages is ignored with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { pair, server } = serve(() => ({ layers: [] }));
      pair.main.postMessage({ ...initMessage(), protocol: 42 });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('protocol'));
      expect(server.stage).toBeUndefined();
      server.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  test('a second init warns and does not recreate the stage', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { pair, server } = serve(() => ({ layers: [] }));
      pair.main.postMessage(initMessage());
      await Promise.resolve();
      const stage = server.stage;
      pair.main.postMessage(initMessage());
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('second init'));
      expect(server.stage).toBe(stage);
      server.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  test('commands after dispose are ignored even without removeEventListener', async () => {
    const onStart = vi.fn();
    const { pair, server } = serve(() => ({ layers: [], onStart }));
    pair.main.postMessage(initMessage());
    await Promise.resolve();
    expect(onStart).toHaveBeenCalledOnce();
    server.dispose();
    // The fake self scope has no removeEventListener, so queued messages still
    // arrive; the disposed guard must swallow them instead of recreating.
    const events: StageWorkerEvent[] = [];
    pair.main.addEventListener('message', (event) => events.push(event.data as StageWorkerEvent));
    pair.main.postMessage(initMessage());
    pair.main.postMessage({ id: 1, protocol: STAGE_WORKER_PROTOCOL, type: 'blob' });
    await Promise.resolve();
    expect(onStart).toHaveBeenCalledOnce();
    expect(server.stage).toBeUndefined();
    expect(events.filter((m) => m.type === 'ready' || m.type === 'blob')).toHaveLength(0);
  });

  test('non-object message payloads warn and are ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { pair, server } = serve(() => ({ layers: [] }));
      pair.main.postMessage('not-a-message');
      pair.main.postMessage(null);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unrecognized'));
      expect(server.stage).toBeUndefined();
      server.dispose();
    } finally {
      warn.mockRestore();
    }
  });

  test('dispose removes the message listener when the scope supports it', async () => {
    const pair = createFakePair();
    const removeEventListener = vi.fn(pair.self.removeEventListener ?? (() => {}));
    const scope: WorkerSelfScope = { ...pair.self, removeEventListener };
    const server = serveStage(scope, () => ({ layers: [] }));
    pair.main.postMessage(initMessage());
    await Promise.resolve();
    server.dispose();
    expect(removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
