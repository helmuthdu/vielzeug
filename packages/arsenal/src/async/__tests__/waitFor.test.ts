import { waitFor } from '../waitFor';

describe('waitFor', () => {
  it('resolves immediately when condition is already true', async () => {
    await expect(waitFor(() => true)).resolves.toBeUndefined();
  });

  it('resolves when the condition becomes true after some polls', async () => {
    let count = 0;

    await expect(waitFor(() => ++count >= 3, { interval: 10 })).resolves.toBeUndefined();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('rejects with a TimeoutError when the condition never becomes true', async () => {
    await expect(waitFor(() => false, { interval: 10, timeout: 50 })).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('rejects when an external signal is aborted', async () => {
    const ac = new AbortController();

    setTimeout(() => ac.abort(new Error('cancelled')), 20);

    await expect(waitFor(() => false, { interval: 10, signal: ac.signal })).rejects.toThrow('cancelled');
  });

  it('passes the merged signal to the condition function', async () => {
    let receivedSignal: AbortSignal | undefined;

    await waitFor((sig) => {
      receivedSignal = sig;

      return true;
    });

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it('resolves when condition is an async function returning true', async () => {
    await expect(waitFor(async () => true, { interval: 10 })).resolves.toBeUndefined();
  });
});
