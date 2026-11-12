import { timer } from '../timer';

describe('timer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the callback once after the armed delay', () => {
    const fn = vi.fn();
    const t = timer(fn);

    t.arm(100);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('replaces a pending run when re-armed', () => {
    const fn = vi.fn();
    const t = timer(fn);

    t.arm(100);
    vi.advanceTimersByTime(60);
    t.arm(100);
    vi.advanceTimersByTime(60);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending run and tolerates repeated cancels', () => {
    const fn = vi.fn();
    const t = timer(fn);

    t.arm(100);
    t.cancel();
    t.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('reports pending until fired or cancelled, and is not pending inside the callback', () => {
    const seen: boolean[] = [];
    const t = timer(() => seen.push(t.pending));

    expect(t.pending).toBe(false);
    t.arm(10);
    expect(t.pending).toBe(true);
    vi.advanceTimersByTime(10);
    expect(t.pending).toBe(false);
    expect(seen).toEqual([false]);
  });

  it('can be re-armed from inside its own callback', () => {
    let runs = 0;
    const t = timer(() => {
      if (++runs < 3) t.arm(10);
    });

    t.arm(10);
    vi.advanceTimersByTime(100);
    expect(runs).toBe(3);
  });
});
