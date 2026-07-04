import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMessages, handleStreamMessages, PROTOCOL_VERSION } from '../protocol';

type Onmessage = ((event: { data: unknown }) => void) | null;

function dispatch(data: unknown): Promise<void> {
  const handler = (self as unknown as { onmessage: Onmessage }).onmessage;

  return Promise.resolve(handler?.({ data }));
}

describe('PROTOCOL_VERSION', () => {
  it('is a positive number constant', () => {
    expect(typeof PROTOCOL_VERSION).toBe('number');
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
  });
});

describe('handleMessages', () => {
  let postMessage: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessage = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessage.mockRestore();
    (self as unknown as { onmessage: Onmessage }).onmessage = null;
  });

  it('forwards the resolved value as { id, result }', async () => {
    handleMessages<number, number>((input) => input * 2);

    await dispatch({ id: 1, input: 21 });

    expect(postMessage).toHaveBeenCalledWith({ id: 1, result: 42 });
  });

  it('awaits an async task function before responding', async () => {
    handleMessages<number, number>(async (input) => {
      await Promise.resolve();

      return input + 1;
    });

    await dispatch({ id: 2, input: 1 });

    expect(postMessage).toHaveBeenCalledWith({ id: 2, result: 2 });
  });

  it('serializes a thrown Error as { id, error }', async () => {
    handleMessages<number, number>(() => {
      throw new Error('boom');
    });

    await dispatch({ id: 3, input: 0 });

    expect(postMessage).toHaveBeenCalledWith({
      error: expect.objectContaining({ message: 'boom', name: 'Error' }),
      id: 3,
    });
  });

  it('wraps a non-Error throw in an Error before serializing', async () => {
    handleMessages<number, number>(() => {
      throw 'not an Error object';
    });

    await dispatch({ id: 4, input: 0 });

    expect(postMessage).toHaveBeenCalledWith({
      error: expect.objectContaining({ message: 'not an Error object', name: 'Error' }),
      id: 4,
    });
  });
});

describe('handleStreamMessages', () => {
  let postMessage: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessage = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessage.mockRestore();
    (self as unknown as { onmessage: Onmessage }).onmessage = null;
  });

  it('forwards each yielded value as { id, chunk }, then { id, result: undefined }', async () => {
    handleStreamMessages<number, number>(async function* (n) {
      for (let i = 0; i < n; i++) yield i;
    });

    await dispatch({ id: 5, input: 3, stream: true });

    expect(postMessage).toHaveBeenNthCalledWith(1, { chunk: 0, id: 5 });
    expect(postMessage).toHaveBeenNthCalledWith(2, { chunk: 1, id: 5 });
    expect(postMessage).toHaveBeenNthCalledWith(3, { chunk: 2, id: 5 });
    expect(postMessage).toHaveBeenNthCalledWith(4, { id: 5, result: undefined });
  });

  it('serializes an error thrown mid-stream as { id, error } without a trailing result message', async () => {
    handleStreamMessages<number, number>(async function* () {
      yield 1;
      throw new Error('stream failed');
    });

    await dispatch({ id: 6, input: 0, stream: true });

    expect(postMessage).toHaveBeenNthCalledWith(1, { chunk: 1, id: 6 });
    expect(postMessage).toHaveBeenNthCalledWith(2, {
      error: expect.objectContaining({ message: 'stream failed', name: 'Error' }),
      id: 6,
    });
    expect(postMessage).toHaveBeenCalledTimes(2);
  });
});
