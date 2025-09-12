import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { sort } from '../packages/toolkit/src/array/sort';
import { getListOfNumbers } from './_utils';

const DATA = getListOfNumbers(1000);

barplot(() => {
  summary(() => {
    bench('vielzeug', function* () {
      yield () => sort(DATA, (val) => val);
    });
    bench('lodash', function* () {
      yield () => _.sortBy(DATA, (val) => val);
    });
  });
});

await run();
