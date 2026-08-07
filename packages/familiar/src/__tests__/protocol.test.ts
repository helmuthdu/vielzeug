import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exposeStream, exposeTask, PROTOCOL_VERSION } from '../protocol';

function dispatch(data: unknown): Promise<void> {
  const handler = (self as unknown as { onmessage?: (event: MessageEvent<unknown>) => void }).onmessage;

  return Promise.resolve(handler?.({ data } as MessageEvent<unknown>));
}

describe('module worker protocol', () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessage = vi.fn();
    Object.defineProperty(self, 'postMessage', { configurable: true, value: postMessage });
  });

  afterEach(() => {
    (self as unknown as { onmessage?: unknown }).onmessage = undefined;
  });

  it('exposes versioned single-result handlers', async () => {
    exposeTask<number, number>((input) => input * 2);

    await dispatch({ id: 4, input: 21, kind: 'run', version: PROTOCOL_VERSION });

    expect(postMessage).toHaveBeenCalledWith({ id: 4, kind: 'result', value: 42, version: PROTOCOL_VERSION });
  });

  it('serializes task failures', async () => {
    exposeTask(() => {
      throw new TypeError('bad input');
    });

    await dispatch({ id: 4, input: null, kind: 'run', version: PROTOCOL_VERSION });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'bad input', name: 'TypeError' }),
        kind: 'error',
      }),
    );
  });

  it('ignores requests from an incompatible protocol version', async () => {
    exposeTask((input: number) => input);

    await dispatch({ id: 4, input: 21, kind: 'run', version: 999 });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('exposes versioned stream handlers', async () => {
    exposeStream(async function* (count: number) {
      for (let value = 0; value < count; value++) yield value;
    });

    await dispatch({ id: 7, input: 2, kind: 'stream', version: PROTOCOL_VERSION });

    expect(postMessage).toHaveBeenNthCalledWith(1, { id: 7, kind: 'chunk', value: 0, version: PROTOCOL_VERSION });
    expect(postMessage).toHaveBeenNthCalledWith(2, { id: 7, kind: 'chunk', value: 1, version: PROTOCOL_VERSION });
    expect(postMessage).toHaveBeenNthCalledWith(3, {
      id: 7,
      kind: 'result',
      value: undefined,
      version: PROTOCOL_VERSION,
    });
  });
});
