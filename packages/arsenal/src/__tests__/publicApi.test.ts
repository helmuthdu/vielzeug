import * as arrayApi from '../array';
import * as asyncApi from '../async';
import * as functionApi from '../function';
import * as arsenal from '../index';
import * as typedApi from '../typed';

describe('public api', () => {
  it('exports the current root helpers', () => {
    expect(arsenal.filterMap).toBeTypeOf('function');
    expect(arsenal.groupBy).toBeTypeOf('function');
    expect(arsenal.indexBy).toBeTypeOf('function');
    expect(arsenal.sample).toBeTypeOf('function');
    expect(arsenal.partial).toBeTypeOf('function');
    expect(arsenal.allOf).toBeTypeOf('function');
    expect(arsenal.isGreaterThan).toBeTypeOf('function');
  });

  it('does not expose removed root helpers', () => {
    expect('select' in arsenal).toBe(false);
    expect('group' in arsenal).toBe(false);
    expect('keyBy' in arsenal).toBe(false);
    expect('sampleSize' in arsenal).toBe(false);
    expect('configure' in arsenal).toBe(false);
    expect('flip' in arsenal).toBe(false);
    expect('race' in arsenal).toBe(false);
    expect('batch' in arsenal).toBe(false);
    expect('predict' in arsenal).toBe(false);
  });

  it('keeps subpath barrels aligned with the current API', () => {
    expect('filterMap' in arrayApi).toBe(true);
    expect('groupBy' in arrayApi).toBe(true);
    expect('indexBy' in arrayApi).toBe(true);
    expect('sample' in arrayApi).toBe(true);
    expect('select' in arrayApi).toBe(false);
    expect('group' in arrayApi).toBe(false);
    expect('keyBy' in arrayApi).toBe(false);

    expect('partial' in functionApi).toBe(true);
    expect('allOf' in functionApi).toBe(true);
    expect('anyOf' in functionApi).toBe(true);
    expect('noneOf' in functionApi).toBe(true);
    expect('and' in functionApi).toBe(false);
    expect('or' in functionApi).toBe(false);
    expect('not' in functionApi).toBe(false);
    expect('configure' in functionApi).toBe(false);
    expect('flip' in functionApi).toBe(false);

    expect('waitFor' in asyncApi).toBe(true);
    expect('predict' in asyncApi).toBe(false);
    expect('race' in asyncApi).toBe(false);
    expect('batch' in asyncApi).toBe(false);
    expect('memoizeAsync' in asyncApi).toBe(false);

    expect('proxy' in arsenal).toBe(false);

    expect('isGreaterThan' in typedApi).toBe(true);
    expect('isLessThanOrEqual' in typedApi).toBe(true);
    expect('isGt' in typedApi).toBe(false);
    expect('isEven' in typedApi).toBe(false);
  });
});
