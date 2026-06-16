import { runAll } from '../runAll';

describe('runAll', () => {
  it('runs all functions in order', () => {
    const order: number[] = [];

    runAll([() => order.push(1), () => order.push(2), () => order.push(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('runs in reverse order with reverse: true', () => {
    const order: number[] = [];

    runAll([() => order.push(1), () => order.push(2), () => order.push(3)], { reverse: true });
    expect(order).toEqual([3, 2, 1]);
  });

  it('does nothing for an empty array', () => {
    expect(() => runAll([])).not.toThrow();
  });

  it('always throws AggregateError even for a single failure', () => {
    const err = new Error('oops');

    try {
      runAll([
        () => {
          throw err;
        },
      ]);
    } catch (e) {
      expect(e).toBeInstanceOf(AggregateError);
      expect((e as AggregateError).errors[0]).toBe(err);
    }
  });

  it('throws AggregateError when multiple functions fail', () => {
    const fn1 = () => {
      throw new Error('a');
    };
    const fn2 = () => {
      throw new Error('b');
    };

    expect(() => runAll([fn1, fn2])).toThrowError(AggregateError);
  });

  it('AggregateError message is always the standard message', () => {
    const fn = () => {
      throw new Error('fail');
    };

    try {
      runAll([fn, fn]);
    } catch (err) {
      expect((err as AggregateError).message).toBe('One or more callbacks failed');
    }
  });

  it('runs non-failing functions even when some fail', () => {
    const ran: string[] = [];

    try {
      runAll([
        () => ran.push('a'),
        () => {
          throw new Error('fail');
        },
        () => ran.push('c'),
      ]);
    } catch {
      /* expected */
    }

    expect(ran).toEqual(['a', 'c']);
  });
});
