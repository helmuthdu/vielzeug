import { first, fromStore, fromSubscribe, of, type ValueOptions } from '@vielzeug/flux';
import { toAsyncIterable } from '@vielzeug/flux/async';
import { createChannel } from '@vielzeug/flux/subjects';

const events = fromSubscribe<number>((listener) => {
  listener(1);
  return () => undefined;
});
const state = fromStore({ getSnapshot: () => 1, subscribe: () => () => undefined });
const options: ValueOptions<number> = { defaultValue: 0 };
const value: Promise<number> = first(of<number>(), options);

void events;
void state;
void value;
void toAsyncIterable;
void createChannel;
