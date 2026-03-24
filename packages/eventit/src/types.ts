export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type BusOptions<T extends EventMap = EventMap> = {
  /** Called on every emit before listeners run. Useful for logging/tracing. */
  onEmit?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
  /** If provided, listener errors are forwarded here instead of re-thrown. */
  onError?: <K extends EventKey<T>>(err: unknown, event: K, payload: T[K]) => void;
};

export type Bus<T extends EventMap> = {
  /** Alias for dispose() — enables the `using` keyword for automatic cleanup. */
  [Symbol.dispose](): void;
  /** Permanently dispose the bus — clears all listeners; pending waits are rejected. Idempotent. */
  dispose(): void;
  /** Whether the bus has been permanently disposed. */
  readonly disposed: boolean;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Async-iterate over all future emits of an event. Terminates when the bus is disposed or signal aborts. */
  events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>;
  /** Number of active listeners for a given event, or total for all events if omitted. */
  listenerCount(event?: EventKey<T>): number;
  /** Subscribe to an event. Returns an unsubscribe function. Stops automatically when signal aborts. */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. Stops early when signal aborts. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Resolve on the next emit. Rejects if the bus is disposed or signal aborts. */
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
};
