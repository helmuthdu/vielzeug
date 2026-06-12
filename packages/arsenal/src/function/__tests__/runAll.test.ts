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

  it('rethrows a single error directly', () => {
    const err = new Error('oops');

    expect(() =>
      runAll([
        () => {
          throw err;
        },
      ]),
    ).toThrow(err);
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

  it('AggregateError includes context prefix when context is provided', () => {
    const fn = () => {
      throw new Error('fail');
    };

    try {
      runAll([fn, fn], { context: 'my-component' });
    } catch (err) {
      expect((err as AggregateError).message).toContain('my-component');
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
