import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { isEqual } from '../packages/toolkit/src/typed/isEqual';
import { getListOfObjects } from './_utils';

const DATA = getListOfObjects(1000);
const DATA1 = [...DATA];
const DATA2 = [...DATA];

barplot(() => {
  summary(() => {
    bench('vielzeug', function* () {
      yield () => isEqual(DATA1, DATA2);
    });
    bench('lodash', function* () {
      yield () => _.isEqual(DATA1, DATA2);
    });
  });
});

await run();
