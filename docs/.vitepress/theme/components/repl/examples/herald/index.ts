import { abortSignalExample } from './abort-signal';
import { asyncGeneratorExample } from './async-generator';
import { asyncWaitExample } from './async-wait';
import { basicBusExample } from './basic-bus';
import { behaviorBusExample } from './behavior-bus';
import { behaviorSnapshotExample } from './behavior-snapshot';
import { busBasicsExample } from './bus-basics';
import { disposalSignalExample } from './disposal-signal';
import { errorHandlingExample } from './error-handling';
import { eventStreamTakeExample } from './event-stream-take';
import { loggerOptionExample } from './logger-option';
import { namedBusExample } from './named-bus';
import { onceAndWaitExample } from './once-and-wait';
import { pipeEventsExample } from './pipe-events';
import { testBusExample } from './test-bus';
import { waitAnyExample } from './wait-any';
import { wildcardListenersExample } from './wildcard-listeners';

export const heraldExamples = {
  'abort-signal': abortSignalExample,
  'async-generator': asyncGeneratorExample,
  'async-wait': asyncWaitExample,
  'basic-bus': basicBusExample,
  'behavior-bus': behaviorBusExample,
  'behavior-snapshot': behaviorSnapshotExample,
  'bus-basics': busBasicsExample,
  'disposal-signal': disposalSignalExample,
  'error-handling': errorHandlingExample,
  'event-stream-take': eventStreamTakeExample,
  'logger-option': loggerOptionExample,
  'named-bus': namedBusExample,
  'once-and-wait': onceAndWaitExample,
  'pipe-events': pipeEventsExample,
  'test-bus': testBusExample,
  'wait-any': waitAnyExample,
  'wildcard-listeners': wildcardListenersExample,
};
