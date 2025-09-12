import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { filter } from '../packages/toolkit/src/array/filter';
import { getListOfNumbers } from './_utils';

const DATA = getListOfNumbers(1000);

barplot(() => {
  summary(() => {
    bench('native', function* () {
      yield () => DATA.filter((val) => val % 2 === 0);
    });
    bench('vielzeug', function* () {
      yield () => filter(DATA, (val) => val % 2 === 0);
    });
    bench('lodash', function* () {
      yield () => _.filter(DATA, (val) => val % 2 === 0);
    });
  });
});

await run();
