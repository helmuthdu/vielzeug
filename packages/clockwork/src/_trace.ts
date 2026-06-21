import type { MachineEvent, TransitionTraceEntry } from './types.js';

export interface TraceBuffer<State extends string, Ev extends MachineEvent> {
  get(): readonly TransitionTraceEntry<State, Ev>[];
  push(entry: TransitionTraceEntry<State, Ev>): void;
}

export function createTraceBuffer<State extends string, Ev extends MachineEvent>(
  limit: number,
): TraceBuffer<State, Ev> | null {
  if (limit <= 0) return null;

  const buffer: TransitionTraceEntry<State, Ev>[] = [];
  let head = 0;
  let count = 0;

  return {
    get() {
      if (count === 0) return [];

      const entries = count < limit ? buffer.slice(0, count) : [...buffer.slice(head), ...buffer.slice(0, head)];

      return entries.map((e) => ({ ...e }));
    },
    push(entry) {
      if (count < limit) {
        buffer.push(entry);
        count++;
      } else {
        buffer[head] = entry;
        head = (head + 1) % limit;
      }
    },
  };
}
