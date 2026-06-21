type Handler = (payload: unknown) => void;

/**
 * A two-level listener map: channel (null = root) → event → Set<handler>.
 * @internal
 */
export class ListenerMap {
  private readonly map = new Map<string | null, Map<string, Set<Handler>>>();

  add(channel: string | null, event: string, handler: Handler): () => void {
    let events = this.map.get(channel);

    if (!events) {
      events = new Map();
      this.map.set(channel, events);
    }

    let handlers = events.get(event);

    if (!handlers) {
      handlers = new Set();
      events.set(event, handlers);
    }

    handlers.add(handler);

    return () => {
      handlers.delete(handler);

      if (handlers.size === 0) events.delete(event);

      if (events.size === 0) this.map.delete(channel);
    };
  }

  dispatch(channel: string | null, event: string, payload: unknown): void {
    this.map
      .get(channel)
      ?.get(event)
      ?.forEach((h) => h(payload));
  }

  clear(): void {
    this.map.clear();
  }
}
