import * as arrayApi from '../array';
import * as asyncApi from '../async';
import * as functionApi from '../function';
import * as toolkit from '../index';
import * as typedApi from '../typed';

describe('public api', () => {
  it('exports the current root helpers', () => {
    expect(toolkit.filterMap).toBeTypeOf('function');
    expect(toolkit.groupBy).toBeTypeOf('function');
    expect(toolkit.indexBy).toBeTypeOf('function');
    expect(toolkit.sample).toBeTypeOf('function');
    expect(toolkit.partial).toBeTypeOf('function');
    expect(toolkit.allOf).toBeTypeOf('function');
    expect(toolkit.isGreaterThan).toBeTypeOf('function');
  });

  it('does not expose removed root helpers', () => {
    expect('select' in toolkit).toBe(false);
    expect('group' in toolkit).toBe(false);
    expect('keyBy' in toolkit).toBe(false);
    expect('sampleSize' in toolkit).toBe(false);
    expect('configure' in toolkit).toBe(false);
    expect('flip' in toolkit).toBe(false);
    expect('race' in toolkit).toBe(false);
    expect('batch' in toolkit).toBe(false);
    expect('predict' in toolkit).toBe(false);
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

    expect('proxy' in toolkit).toBe(false);

    expect('isGreaterThan' in typedApi).toBe(true);
    expect('isLessThanOrEqual' in typedApi).toBe(true);
    expect('isGt' in typedApi).toBe(false);
    expect('isEven' in typedApi).toBe(false);
  });
});
