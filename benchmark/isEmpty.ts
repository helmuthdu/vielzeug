import _ from 'lodash';
import { barplot, bench, run, summary } from 'mitata';
import { isEmpty } from '../packages/toolkit/src/typed/isEmpty';

barplot(() => {
  summary(() => {
    bench('vielzeug', function* () {
      yield () => {
        isEmpty(null);
        isEmpty(undefined);
        isEmpty([]);
        isEmpty({});
        isEmpty('');
        isEmpty(123);
        isEmpty('abc');
        isEmpty([1, 2, 3]);
        isEmpty({ a: 1, b: 2 });
      };
    });
    bench('lodash', function* () {
      yield () => {
        _.isEmpty(null);
        _.isEmpty(undefined);
        _.isEmpty([]);
        _.isEmpty({});
        _.isEmpty('');
        _.isEmpty(123);
        _.isEmpty('abc');
        _.isEmpty([1, 2, 3]);
        _.isEmpty({ a: 1, b: 2 });
      };
    });
  });
});

await run();
