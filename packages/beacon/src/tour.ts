import { signal } from '@vielzeug/ripple';
import { devOnly, warn } from './_dev';
import { createTappers } from './_emit';
import { scrollTargetIntoView } from './_scroll';
import { createMemoryStorage, parseProgress, storageKey } from './_storage';
import { observeTarget, observeTargetLayout } from './_target';
import { BeaconConfigError, BeaconDisposedError } from './errors';
import { resolveTarget, sameRect, targetAvailable } from './target';
import type {
  BeaconCurrentStep,
  BeaconProgress,
  BeaconStatus,
  BeaconTarget,
  BeaconTourConfig,
  BeaconTourEvent,
  BeaconTourHandle,
} from './types';

const validateConfig = (config: BeaconTourConfig): void => {
  if (!config.id) throw new BeaconConfigError('createTour: "id" must be a non-empty string');
  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    throw new BeaconConfigError(`createTour: tour "${config.id}" must have at least one step`);
  }

  const seen = new Set<string>();
  for (const step of config.steps) {
    if (!step.id) throw new BeaconConfigError(`createTour: every step of tour "${config.id}" needs a non-empty id`);
    if (seen.has(step.id)) {
      throw new BeaconConfigError(`createTour: duplicate step id "${step.id}" in tour "${config.id}"`);
    }
    seen.add(step.id);
  }
};

/**
 * Creates a guided tour: a sequential, resumable walkthrough over the app's own
 * DOM. The engine owns step order, target waiting, persistence, and events; a
 * presentation layer (refine's tour components or the app's markup) renders
 * `current` wherever it likes.
 *
 * Progress persists under the tour's id. A stored record written under an older
 * `version` makes the tour eligible again, which is how feature announcements
 * re-reach users who finished the original tour.
 */
export function createTour(config: BeaconTourConfig): BeaconTourHandle {
  validateConfig(config);

  const version = config.version ?? 1;
  const targetTimeoutMs = config.targetTimeoutMs ?? Number.POSITIVE_INFINITY;
  const autoScroll = config.autoScroll ?? true;
  const storage = config.storage ?? createMemoryStorage();
  const key = storageKey(config.id);

  const controller = new AbortController();
  const { signal: disposal } = controller;
  const { emit, warn: warnTap, tap, clear: clearTappers } = createTappers<BeaconTourEvent>(disposal);

  const status = signal<BeaconStatus>('idle');
  const eligible = signal(true);
  const current = signal<BeaconCurrentStep>({
    placement: config.placement ?? 'auto',
    presentation: config.presentation ?? 'auto',
    rect: null,
    step: null,
    stepIndex: -1,
    totalSteps: config.steps.length,
  });

  let stopWaiting: (() => void) | null = null;
  let loadSequence = 0;

  const disposedError = (): BeaconDisposedError => new BeaconDisposedError('This tour handle has been disposed.');
  const guard = (): void => {
    if (disposal.aborted) throw disposedError();
  };

  const persist = (): void => {
    const record: BeaconProgress = { status: status.peek(), stepIndex: current.peek().stepIndex, version };

    try {
      const result = storage.set(key, record) as unknown;
      if (result instanceof Promise) result.catch((error: unknown) => warnTap(error));
    } catch (error) {
      warnTap(error);
    }
  };

  const clearPersisted = (): void => {
    try {
      const result = storage.remove(key) as unknown;
      if (result instanceof Promise) result.catch((error: unknown) => warnTap(error));
    } catch (error) {
      warnTap(error);
    }
  };

  const setStatus = (next: BeaconStatus): void => {
    if (status.peek() === next) return;
    status.value = next;
    persist();
    emit({ status: next, type: 'status-change' });
  };

  const stopTargetWatch = (): void => {
    stopWaiting?.();
    stopWaiting = null;
  };

  /** Re-reads the active step's rect; republishes only when it actually moved. */
  const refreshActiveRect = (): void => {
    const step = current.peek().step;
    if (!step?.target) return;
    const rect = resolveTarget(step.target);
    if (sameRect(rect, current.peek().rect)) return;
    current.value = { ...current.peek(), rect };
  };

  /**
   * Keeps the active step's rect honest for as long as the step is visible:
   * scroll and resize move the target, the target's own box can resize, and
   * content added elsewhere on the page can push it around without either —
   * all of which refresh the rect. A target that leaves the document
   * (collapsed menu, route change) drops the rect to `null` instead of
   * anchoring the card to a ghost. The card's positioner re-measures on the
   * repaint the rect write triggers, so no extra listener is needed there.
   */
  const watchActiveTarget = (target: BeaconTarget): (() => void) => {
    let stopped = false;
    const onLayout = (): void => {
      if (!stopped) refreshActiveRect();
    };

    window.addEventListener('scroll', onLayout, { passive: true });
    window.addEventListener('resize', onLayout);
    const stopObserver = observeTarget(target, onLayout, disposal);
    const stopLayout = observeTargetLayout(target, onLayout, disposal);
    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      window.removeEventListener('scroll', onLayout);
      window.removeEventListener('resize', onLayout);
      stopObserver?.();
      stopLayout?.();
    };
    disposal.addEventListener('abort', stop, { once: true });

    return stop;
  };

  /** Publishes `index` as the visible step: completes the previous step, emits step:start, scrolls. */
  const publishStep = (index: number): void => {
    stopTargetWatch();
    const step = config.steps[index] ?? null;
    const previous = current.peek().step;
    if (previous && previous !== step) emit({ index: current.peek().stepIndex, step: previous, type: 'step:complete' });

    current.value = {
      placement: step?.placement ?? config.placement ?? 'auto',
      presentation: step?.presentation ?? config.presentation ?? 'auto',
      rect: step?.target ? resolveTarget(step.target) : null,
      step,
      stepIndex: index,
      totalSteps: config.steps.length,
    };

    if (step) {
      emit({ index, step, type: 'step:start' });
      if (autoScroll && step.target) scrollTargetIntoView(step.target, { offset: config.scrollOffset });
      if (step.target) stopWaiting = watchActiveTarget(step.target);
    }
  };

  const finishInternal = (reason: 'finish' | 'skip'): void => {
    stopTargetWatch();
    const step = current.peek().step;
    if (step) emit({ index: current.peek().stepIndex, step, type: 'step:complete' });
    current.value = { ...current.peek(), rect: null, step: null, stepIndex: -1 };
    setStatus('completed');
    emit({ reason, type: 'tour:complete' });
  };

  /**
   * Makes `index` the active step, waiting for its target when it is not on
   * screen yet (lazy route, closed dialog) and reporting `target-waiting` so a
   * presentation can say "continue when you're ready" instead of looking
   * frozen. A step without a target (intro or outro) and a `targetTimeoutMs`
   * of `0` publish immediately.
   */
  const activateStep = (index: number): void => {
    stopTargetWatch();
    const step = config.steps[index];
    if (!step) return;

    if (!step.target || targetTimeoutMs === 0 || targetAvailable(step.target)) {
      publishStep(index);
      return;
    }

    let waiting = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopObserver: (() => void) | null = null;
    const target = step.target;
    stopWaiting = (): void => {
      waiting = false;
      stopObserver?.();
      stopObserver = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    stopObserver = observeTarget(
      target,
      () => {
        if (waiting && targetAvailable(target)) {
          publishStep(index);
        }
      },
      disposal,
    );

    if (!stopObserver) {
      devOnly(() => warn(`step "${step.id}" of tour "${config.id}" has a static target that is not in the document`));
    }

    emit({ index, message: `Waiting for step "${step.id}" to become visible.`, step, type: 'target-waiting' });

    if (Number.isFinite(targetTimeoutMs)) {
      timer = setTimeout(() => {
        if (!waiting) return;
        stopTargetWatch();
        emit({
          message: `Skipped step "${step.id}": its target did not appear within ${targetTimeoutMs}ms.`,
          type: 'target-missing',
        });
        if (index + 1 < config.steps.length) activateStep(index + 1);
        else finishInternal('finish');
      }, targetTimeoutMs);
    }
  };

  const advanceTo = (index: number): void => {
    if (index < 0) return;
    if (index >= config.steps.length) {
      finishInternal('finish');
      return;
    }
    if (status.peek() !== 'active') setStatus('active');
    activateStep(index);
  };

  const startInternal = (): void => {
    guard();
    const s = status.peek();
    if (s === 'completed' || s === 'dismissed' || s === 'active') return;
    const resumeAt = Math.max(0, current.peek().stepIndex);
    setStatus('active');
    activateStep(resumeAt);
  };

  // Boot: load persisted progress, then decide eligibility and optional autoStart.
  const sequence = ++loadSequence;
  const applyStored = (raw: unknown): void => {
    if (sequence !== loadSequence || disposal.aborted) return;
    const stored = parseProgress(raw);

    if (stored && stored.version >= version) {
      if (stored.status === 'completed' || stored.status === 'dismissed') {
        status.value = stored.status;
        eligible.value = false;
        return;
      }
      if (stored.status === 'active' || stored.status === 'paused') {
        status.value = 'paused';
        current.value = { ...current.peek(), stepIndex: Math.min(stored.stepIndex, config.steps.length - 1) };
      }
    }
    // Fresh, paused, or superseded by a newer version: eligible.
    eligible.value = true;
    if (config.autoStart) {
      queueMicrotask(() => {
        if (!disposal.aborted) startInternal();
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
    back(): void {
      guard();
      advanceTo(current.peek().stepIndex - 1);
    },
    current,
    dismiss(): void {
      guard();
      if (status.peek() === 'completed' || status.peek() === 'dismissed') return;
      stopTargetWatch();
      current.value = { ...current.peek(), rect: null, step: null, stepIndex: -1 };
      setStatus('dismissed');
      emit({ type: 'tour:dismiss' });
    },
    disposalSignal: disposal,
    dispose(): void {
      if (disposal.aborted) return;
      emit({ type: 'dispose' });
      stopTargetWatch();
      controller.abort();
      clearTappers();
    },
    get disposed(): boolean {
      return disposal.aborted;
    },
    eligible,
    finish(): void {
      guard();
      if (status.peek() === 'completed') return;
      finishInternal('finish');
    },
    goto(step: number | string): void {
      guard();
      const index = typeof step === 'number' ? step : config.steps.findIndex((candidate) => candidate.id === step);
      if (index < 0 || index >= config.steps.length) {
        warn(`goto: step "${String(step)}" is not part of tour "${config.id}"`);
        return;
      }
      advanceTo(index);
    },
    id: config.id,
    next(): void {
      guard();
      advanceTo(current.peek().stepIndex + 1);
    },
    pause(): void {
      guard();
      if (status.peek() !== 'active') return;
      stopTargetWatch();
      current.value = { ...current.peek(), rect: null };
      setStatus('paused');
    },
    reset(): void {
      guard();
      stopTargetWatch();
      clearPersisted();
      current.value = {
        placement: config.placement ?? 'auto',
        presentation: config.presentation ?? 'auto',
        rect: null,
        step: null,
        stepIndex: -1,
        totalSteps: config.steps.length,
      };
      status.value = 'idle';
      eligible.value = true;
      emit({ status: 'idle', type: 'status-change' });
    },
    skip(): void {
      guard();
      if (status.peek() === 'completed' || status.peek() === 'dismissed') return;
      stopTargetWatch();
      current.value = { ...current.peek(), rect: null, step: null, stepIndex: -1 };
      setStatus('dismissed');
      emit({ reason: 'skip', type: 'tour:complete' });
    },
    start: startInternal,
    status,
    steps: config.steps,
    tap,
    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
