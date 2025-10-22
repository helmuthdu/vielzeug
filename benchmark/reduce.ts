/** biome-ignore-all lint/performance/noAccumulatingSpread: - */
import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { reduce } from '../packages/toolkit/src/array/reduce';
import { getListOfNumbers } from './_utils';

const DATA = getListOfNumbers(1000);

barplot(() => {
  summary(() => {
    bench('native', function* () {
      yield () => DATA.reduce((acc, val) => ({ ...acc, [val]: val * 2 }), {});
    });
    bench('vielzeug', function* () {
      yield () => reduce(DATA, (acc, val) => ({ ...acc, [val]: val * 2 }), {});
    });
    bench('lodash', function* () {
      yield () => _.reduce(DATA, (acc, val) => ({ ...acc, [val]: val * 2 }), {});
    });
  });
});

await run();
