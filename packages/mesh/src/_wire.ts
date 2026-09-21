/** Wire envelope serialized through the configured `serialize` function. */
export interface WireEnvelope {
  readonly id: string;
  readonly p: unknown;
  readonly t: string;
  readonly ts: number;
  readonly v: 1;
}

/** Returns the envelope, or `null` when the value violates the wire shape. */
export function toEnvelope(value: unknown): WireEnvelope | null {
  if (typeof value !== 'object' || value === null) return null;
  const env = value as Record<string, unknown>;
  if (env.v !== 1 || typeof env.id !== 'string' || typeof env.t !== 'string' || typeof env.ts !== 'number') return null;
  return value as WireEnvelope;
}

/** Per-peer duplicate guard: remembers the last `capacity` message ids (LRU). */
export class MessageDedupe {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  private readonly capacity: number;

  constructor(capacity = 256) {
    this.capacity = capacity;
  }

  /** `true` when the id is new (and records it); `false` for duplicates. */
  check(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.order.push(id);
    if (this.order.length > this.capacity) this.seen.delete(this.order.shift()!);
    return true;
  }
}
