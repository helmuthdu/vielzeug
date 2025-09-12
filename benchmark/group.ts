import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { group } from '../packages/toolkit/src/array/group';
import { getListOfObjects } from './_utils';

const DATA = getListOfObjects(1000);

barplot(() => {
  summary(() => {
    bench('native', function* () {
      yield () => Object.groupBy(DATA, (item) => item.foo);
    });
    bench('vielzeug', function* () {
      yield () => group(DATA, (item) => item.foo);
    });
    bench('lodash', function* () {
      yield () => _.groupBy(DATA, (item) => item.foo);
    });
  });
});

await run();
