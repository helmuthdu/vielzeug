import {
  type BatchOptions,
  createStreamWorker,
  createWorker,
  FamiliarRuntimeError,
  runBatch,
} from '@vielzeug/familiar';
import { exposeStream, exposeTask, PROTOCOL_VERSION } from '@vielzeug/familiar/protocol';
import { createTestWorker } from '@vielzeug/familiar/testing';

void createStreamWorker;
void createWorker;
void FamiliarRuntimeError;
void exposeStream;
void exposeTask;
void PROTOCOL_VERSION;
const pool = createTestWorker((value: number) => value * 2);
const options: BatchOptions<number> = { getTransferables: () => [] };
const batch: AsyncIterable<number> = runBatch(pool, [1, 2], options);

void batch;
