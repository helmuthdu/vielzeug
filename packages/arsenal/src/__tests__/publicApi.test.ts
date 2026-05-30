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
    expect(arsenal.deepMerge).toBeTypeOf('function');
    expect(arsenal.deepMergeWith).toBeTypeOf('function');
    expect(arsenal.getPath).toBeTypeOf('function');
    expect(arsenal.retry).toBeTypeOf('function');
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
    // Removed in R6 (moved to @vielzeug/coins)
    expect('currency' in arsenal).toBe(false);
    expect('exchange' in arsenal).toBe(false);
    // Removed in R8-R12 (thin wrappers)
    expect('defer' in arsenal).toBe(false);
    expect('Scheduler' in arsenal).toBe(false);
    expect('polyfillScheduler' in arsenal).toBe(false);
    expect('deepClone' in arsenal).toBe(false);
    // Removed in R9, R5
    expect('assertAll' in arsenal).toBe(false);
    expect('is' in arsenal).toBe(false);
    // Removed in R13 (merged into retry)
    expect('attempt' in arsenal).toBe(false);
    // get renamed to getPath in R16
    expect('get' in arsenal).toBe(false);
    // Error constants not part of public API (R14)
    expect('IS_ARRAY_ERROR_MSG' in arsenal).toBe(false);
    expect('IS_OBJECT_ERROR_MSG' in arsenal).toBe(false);
    expect('IS_STRING_ERROR_MSG' in arsenal).toBe(false);
    expect('IS_NUMBER_ERROR_MSG' in arsenal).toBe(false);
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
    expect('not' in functionApi).toBe(true);
    expect('assertAll' in functionApi).toBe(false);
    expect('and' in functionApi).toBe(false);
    expect('or' in functionApi).toBe(false);
    expect('configure' in functionApi).toBe(false);
    expect('flip' in functionApi).toBe(false);

    expect('waitFor' in asyncApi).toBe(true);
    expect('retry' in asyncApi).toBe(false); // moved to concurrency subpath
    expect('parallel' in asyncApi).toBe(false); // moved to concurrency subpath
    expect('queue' in asyncApi).toBe(false); // moved to concurrency subpath
    expect('attempt' in asyncApi).toBe(false);
    expect('defer' in asyncApi).toBe(false);
    expect('Scheduler' in asyncApi).toBe(false);
    expect('predict' in asyncApi).toBe(false);
    expect('race' in asyncApi).toBe(false);
    expect('batch' in asyncApi).toBe(false);
    expect('memoizeAsync' in asyncApi).toBe(false);

    expect('proxy' in arsenal).toBe(false);

    expect('isGreaterThan' in typedApi).toBe(true);
    expect('isLessThanOrEqual' in typedApi).toBe(true);
    expect('is' in typedApi).toBe(false);
    expect('IS_ARRAY_ERROR_MSG' in typedApi).toBe(false);
    expect('isGt' in typedApi).toBe(false);
    expect('isEven' in typedApi).toBe(false);
  });
});
