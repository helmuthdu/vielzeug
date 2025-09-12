import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { every } from '../packages/toolkit/src/array/every';
import { getListOfNumbers } from './_utils';

const DATA = getListOfNumbers(1000);

barplot(() => {
  summary(() => {
    bench('native', function* () {
      yield () => DATA.every((val) => val % 2 === 0);
    });
    bench('vielzeug', function* () {
      yield () => every(DATA, (val) => val % 2 === 0);
    });
    bench('lodash', function* () {
      yield () => _.every(DATA, (val) => val % 2 === 0);
    });
  });
});

await run();
