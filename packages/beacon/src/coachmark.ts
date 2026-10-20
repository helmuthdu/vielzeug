import { signal } from '@vielzeug/ripple';
import { createTappers } from './_emit';
import { createMemoryStorage, parseProgress, storageKey } from './_storage';
import { observeTarget, observeTargetLayout } from './_target';
import { BeaconConfigError, BeaconDisposedError } from './errors';
import { resolveTarget, sameRect } from './target';
import type {
  BeaconCoachmarkConfig,
  BeaconCoachmarkEvent,
  BeaconCoachmarkHandle,
  BeaconCurrentStep,
  BeaconProgress,
  BeaconStep,
} from './types';

/**
 * Creates a coachmark: a single contextual hint anchored to one target, shown
 * the first time a user reaches that feature and dismissed permanently after.
 * The same "explain this button once" pattern that makes tours worth keeping
 * after launch week, without sequencing anything.
 *
 * Like tours, coachmarks version: bumping `version` re-shows a hint users
 * already saw, which covers a button whose meaning changed.
 */
export function createCoachmark(config: BeaconCoachmarkConfig): BeaconCoachmarkHandle {
  if (!config.id) throw new BeaconConfigError('createCoachmark: "id" must be a non-empty string');

  const version = config.version ?? 1;
  const autoShow = config.autoShow ?? true;
  const storage = config.storage ?? createMemoryStorage();
  const key = storageKey(config.id);

  const controller = new AbortController();
  const { signal: disposal } = controller;
  const { emit, warn: warnTap, tap, clear: clearTappers } = createTappers<BeaconCoachmarkEvent>(disposal);

  const eligible = signal(true);

  const step: BeaconStep = {
    data: config.data,
    description: config.description,
    id: config.id,
    placement: config.placement ?? 'auto',
    presentation: config.presentation ?? 'auto',
    target: config.target,
    title: config.title,
  };

  const HIDDEN: BeaconCurrentStep = {
    placement: step.placement ?? 'auto',
    presentation: step.presentation ?? 'auto',
    rect: null,
    step: null,
    stepIndex: 0,
    totalSteps: 0,
  };

  const current = signal<BeaconCurrentStep>(HIDDEN);

  let stopWaiting: (() => void) | null = null;
  let loadSequence = 0;

  const disposedError = (): BeaconDisposedError => new BeaconDisposedError('This coachmark handle has been disposed.');
  const guard = (): void => {
    if (disposal.aborted) throw disposedError();
  };

  const persistSeen = (): void => {
    const record: BeaconProgress = { status: 'completed', stepIndex: 0, version };

    try {
      const result = storage.set(key, record) as unknown;
      if (result instanceof Promise) result.catch((error: unknown) => warnTap(error));
    } catch (error) {
      warnTap(error);
    }
  };

  const stopWaitingForTarget = (): void => {
    stopWaiting?.();
    stopWaiting = null;
  };

  const showInternal = (): void => {
    guard();
    if (!eligible.peek() || current.peek().step !== null) return;

    const publish = (): void => {
      current.value = { ...HIDDEN, rect: resolveTarget(config.target), step };
      emit({ type: 'coachmark:show' });
      watchLayout();
    };

    // Keep the rect honest while the hint is up: scroll and resize move the
    // target, the target's box can resize, and page growth can push it around;
    // a target that leaves the document drops the rect to null.
    const watchLayout = (): void => {
      const onLayout = (): void => {
        const rect = resolveTarget(config.target);
        if (sameRect(rect, current.peek().rect)) return;
        current.value = { ...current.peek(), rect };
      };

      window.addEventListener('scroll', onLayout, { passive: true });
      window.addEventListener('resize', onLayout);
      const stopObserver = observeTargetLayout(config.target, onLayout, disposal);
      const stop = (): void => {
        window.removeEventListener('scroll', onLayout);
        window.removeEventListener('resize', onLayout);
        stopObserver?.();
      };
      disposal.addEventListener('abort', stop, { once: true });
      stopWaiting = (): void => {
        stop();
        stopWaiting = null;
      };
    };

    if (resolveTarget(config.target)) {
      publish();
      return;
    }

    // Target not mounted yet: wait for it so the hint appears when the user reaches the feature.
    let waiting = true;
    let stopObserver: (() => void) | null = null;
    stopWaiting = (): void => {
      waiting = false;
      stopObserver?.();
      stopObserver = null;
    };
    stopObserver = observeTarget(
      config.target,
      () => {
        if (!waiting || !eligible.peek()) return;
        stopWaitingForTarget();
        publish();
      },
      disposal,
    );
    emit({ type: 'target-waiting' });
  };

  // Boot: read the seen-record, then optionally auto-show.
  const sequence = ++loadSequence;
  const applyStored = (raw: unknown): void => {
    if (sequence !== loadSequence || disposal.aborted) return;
    const stored = parseProgress(raw);
    eligible.value = !(stored && stored.version >= version && stored.status === 'completed');
    if (eligible.peek() && autoShow) {
      queueMicrotask(() => {
        if (!disposal.aborted) showInternal();
      });
    }
  };

  try {
    const loaded = storage.get(key) as unknown;
    if (loaded instanceof Promise) loaded.then(applyStored, (error: unknown) => warnTap(error));
    else applyStored(loaded);
  } catch (error) {
    warnTap(error);
  }

  return {
    current,
    dismiss(): void {
      guard();
      stopWaitingForTarget();
      current.value = HIDDEN;
      eligible.value = false;
      persistSeen();
      emit({ type: 'coachmark:dismiss' });
    },
    disposalSignal: disposal,
    dispose(): void {
      if (disposal.aborted) return;
      emit({ type: 'dispose' });
      stopWaitingForTarget();
      controller.abort();
      clearTappers();
    },
    get disposed(): boolean {
      return disposal.aborted;
    },
    eligible,
    hide(): void {
      guard();
      stopWaitingForTarget();
      current.value = HIDDEN;
    },
    id: config.id,
    reset(): void {
      guard();
      try {
        const result = storage.remove(key) as unknown;
        if (result instanceof Promise) result.catch((error: unknown) => warnTap(error));
      } catch (error) {
        warnTap(error);
      }
      eligible.value = true;
    },
    show: showInternal,
    tap,
    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
