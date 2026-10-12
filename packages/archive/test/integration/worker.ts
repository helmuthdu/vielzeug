import { createArchiveWorker } from '../../src/worker';
import { recipeCollection } from './fixture-collection';

/**
 * The integration-suite Worker: the package's own core over the recipes fixture
 * collection, bundled from source exactly the way a deployment's entry is. The tap
 * mirrors a deployment's own log line into the worker log the suite reads.
 */
const worker = createArchiveWorker([recipeCollection]);
worker.tap((event) => console.log(JSON.stringify(event)));
export default worker;
