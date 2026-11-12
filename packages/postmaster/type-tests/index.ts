import { createPostmaster, defineJob } from '../src/index.js';
import { createMemoryPostmasterStore } from '../src/testing.js';

interface Todo {
  id: string;
  title: string;
}

// Payload type flows from `validate` into key/execute and into enqueue.
const jobs = {
  // With neither, payloads stay unknown.
  anon: defineJob({
    execute: async (payload) => {
      const value: unknown = payload;
      void value;
    },
    key: (payload) => String(payload),
    version: 1,
  }),
  createTodo: defineJob({
    execute: async (payload, context) => {
      const id: string = payload.id;
      const attempt: number = context.attempt;
      const aborted: boolean = context.signal.aborted;
      void id;
      void attempt;
      void aborted;
    },
    key: (payload) => payload.id,
    validate: (value): Todo => value as Todo,
    version: 1,
  }),
  // Without validate, an annotated execute carries the payload type.
  log: defineJob({
    execute: async (payload: { line: string }) => {
      void payload.line;
    },
    key: (payload) => payload.line,
    version: 1,
  }),
};

// A { parse } validator object (for example a Spell schema) infers the same way.
declare const schema: { parse(value: unknown): { n: number } };
const parsed = defineJob({
  execute: async (payload) => {
    void payload.n;
  },
  key: (payload) => String(payload.n),
  validate: schema,
  version: 1,
});

const postmaster = createPostmaster({ jobs, store: createMemoryPostmasterStore() });

async function use(): Promise<void> {
  await postmaster.enqueue('createTodo', { id: '1', title: 'Buy milk' });
  await postmaster.enqueue('log', { line: 'hello' });
  await postmaster.enqueue('anon', 'anything');
  await postmaster.enqueue('anon', 42);
  // @ts-expect-error wrong payload shape for createTodo
  await postmaster.enqueue('createTodo', { id: 1 });
  // @ts-expect-error unknown job name
  await postmaster.enqueue('nope', 'x');
}

void parsed;
void use;
