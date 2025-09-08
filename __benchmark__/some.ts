import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { some } from '../packages/toolkit/src/array/some';
import { getListOfNumbers } from './_utils';

const DATA = getListOfNumbers(1000);

barplot(() => {
  summary(() => {
    bench('native', function* () {
      yield () => DATA.some((val) => val % 2 === 0);
    });
    bench('vielzeug', function* () {
      yield () => some(DATA, (val) => val % 2 === 0);
    });
    bench('lodash', function* () {
      yield () => _.some(DATA, (val) => val % 2 === 0);
    });
  });
});

await run();
