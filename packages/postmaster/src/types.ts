export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface RetryPolicy {
  readonly delay?: (attempt: number) => number;
  readonly maxAttempts: number;
  readonly shouldRetry: (error: unknown, attempt: number) => boolean;
}

export interface JobContext {
  readonly attempt: number;
  readonly entryId: string;
  readonly key: string;
  readonly signal: AbortSignal;
}

export type Validate<T> = ((value: unknown) => T) | { parse(value: unknown): T };

export interface JobDefinition<T> {
  readonly execute: (payload: T, context: JobContext) => Promise<void>;
  readonly key: (payload: T) => string;
  readonly migrate?: (payload: unknown, fromVersion: number) => unknown;
  readonly retry?: RetryPolicy;
  readonly validate?: Validate<T>;
  readonly version: number;
}

export type JobDefinitions = Record<string, JobDefinition<unknown>>;
export type InferJobPayload<J> = J extends JobDefinition<infer T> ? T : never;

export type EntryStatus = 'dead-letter' | 'queued' | 'running';

export interface StoredFailure {
  readonly message: string;
  readonly name: string;
  readonly occurredAt: number;
}

export interface StoredJob {
  readonly attempts: number;
  readonly availableAt: number;
  readonly createdAt: number;
  readonly failure?: StoredFailure;
  readonly id: string;
  readonly key: string;
  readonly leaseExpiresAt?: number;
  readonly name: string;
  readonly ownerId?: string;
  readonly payload: JsonValue;
  readonly status: EntryStatus;
  readonly updatedAt: number;
  readonly version: number;
}

export type PostmasterEntry = Pick<
  StoredJob,
  'attempts' | 'availableAt' | 'createdAt' | 'failure' | 'id' | 'key' | 'name' | 'status' | 'updatedAt' | 'version'
>;

export interface EntryFilter {
  readonly status?: EntryStatus;
}

export interface PostmasterStats {
  readonly deadLetter: number;
  readonly queued: number;
  readonly running: number;
}

export type RetryResult =
  | { readonly status: 'not-dead-letter' | 'not-found' | 'running' }
  | { readonly entry: PostmasterEntry; readonly status: 'retried' };

export type RemoveResult =
  | { readonly status: 'not-found' | 'running' }
  | { readonly id: string; readonly status: 'removed' };

/**
 * Transactional operations available inside `PostmasterStore.transact()`.
 * Stores implement these primitives; the processor owns all ownership/transition logic.
 */
export interface StoreTx {
  countByStatus(): Promise<PostmasterStats>;
  delete(id: string): Promise<void>;
  /** Earliest claimable job: queued with `availableAt <= now`, or running with expired lease. Ordered by availableAt then createdAt. */
  findClaimable(now: number): Promise<StoredJob | undefined>;
  /** Earliest future wake time across queued `availableAt > now` and running `leaseExpiresAt > now`, or undefined if none. */
  findNextWake(now: number): Promise<number | undefined>;
  get(id: string): Promise<StoredJob | undefined>;
  put(entry: StoredJob): Promise<void>;
}

export interface PostmasterStore {
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  list(filter?: EntryFilter): Promise<StoredJob[]>;
  subscribe(listener: () => void): () => void;
  transact<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type PostmasterEvent =
  | {
      readonly entry: PostmasterEntry;
      readonly type: 'enqueued' | 'started' | 'completed' | 'retry-scheduled' | 'dead-lettered';
    }
  | { readonly id: string; readonly type: 'removed' | 'lease-lost' }
  | { readonly error: Error; readonly type: 'processor-error' }
  | { readonly type: 'dispose' };

export interface FlushResult {
  readonly completed: number;
  readonly deadLettered: number;
  readonly processed: number;
  readonly retryScheduled: number;
}

export interface CreatePostmasterOptions<J extends JobDefinitions> {
  readonly clock?: () => number;
  readonly jobs: J;
  readonly leaseDuration?: number;
  readonly signal?: AbortSignal;
  readonly store: PostmasterStore;
}

export interface Postmaster<J extends JobDefinitions> {
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  enqueue<K extends keyof J & string>(name: K, payload: InferJobPayload<J[K]>): Promise<PostmasterEntry>;
  flush(options?: { signal?: AbortSignal }): Promise<FlushResult>;
  list(filter?: EntryFilter): Promise<PostmasterEntry[]>;
  remove(id: string): Promise<RemoveResult>;
  retry(id: string): Promise<RetryResult>;
  start(): Promise<void>;
  stats(): Promise<PostmasterStats>;
  tap(handler: (event: PostmasterEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.asyncDispose](): Promise<void>;
}
