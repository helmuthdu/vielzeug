import { createChannel, first, fromStore, fromSubscribe, of, toAsyncIterable, type ValueOptions } from '@vielzeug/flux';

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
