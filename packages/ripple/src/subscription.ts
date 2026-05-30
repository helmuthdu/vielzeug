import type { AsyncSubscription, CleanupFn, Subscription } from './types';

// ── SubscriptionImpl (R6, R7) ────────────────────────────────────────────────
//
// R6: [Symbol.dispose] delegates to dispose() instead of duplicating the logic.
// R7: dispose() is idempotent — calling it twice is safe (fn_ set to null after first call).

export class SubscriptionImpl implements Subscription {
  private fn_: CleanupFn | null;

  constructor(fn: CleanupFn) {
    this.fn_ = fn;
  }

  dispose(): void {
    if (this.fn_ === null) return;

    const fn = this.fn_;

    this.fn_ = null;
    fn();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── AsyncSubscriptionImpl ─────────────────────────────────────────────────────
//
// Wraps a synchronous stop handle + an async drain function.
// disposeAsync() stops the effect synchronously and then awaits full teardown.

export class AsyncSubscriptionImpl implements AsyncSubscription {
  private awaitDone_: () => Promise<void>;
  private syncStop_: Subscription;

  constructor(syncStop: Subscription, awaitDone: () => Promise<void>) {
    this.awaitDone_ = awaitDone;
    this.syncStop_ = syncStop;
  }

  dispose(): void {
    this.syncStop_.dispose();
  }

  async disposeAsync(): Promise<void> {
    this.dispose();
    await this.awaitDone_();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
