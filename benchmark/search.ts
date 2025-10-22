import { barplot, bench, run, summary } from 'mitata';
import { search } from '../packages/toolkit/src/array/search';
import { getListOfObjects } from './_utils';

const DATA = getListOfObjects(1000);

barplot(() => {
  summary(() => {
    bench('vielzeug', function* () {
      yield () => search(DATA, '1234', 0.5);
    });
  });
});

await run();
