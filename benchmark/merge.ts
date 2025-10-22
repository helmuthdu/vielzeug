import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { merge } from '../packages/toolkit/src/object/merge';
import { getListOfObjects } from './_utils';

const DATA = getListOfObjects(1000);
const DATA1 = [...DATA];
const DATA2 = [...DATA];

barplot(() => {
  summary(() => {
    bench('vielzeug', function* () {
      yield () => merge('deep', DATA1, DATA2);
    });
    bench('lodash', function* () {
      yield () => _.merge(DATA1, DATA2);
    });
  });
});

await run();
