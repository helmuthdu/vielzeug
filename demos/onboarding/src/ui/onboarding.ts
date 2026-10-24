import { type BeaconStorage, type BeaconTargetResolver, createCoachmark, createTour } from '@vielzeug/beacon';
import type { OreTourElement } from '@vielzeug/refine/tour';
import { computed, type Disposable, type Readable } from '@vielzeug/ripple';
import { productTour, shareCoachmark } from '../core/tours';

export interface OnboardingHandle extends Disposable {
  /** Close the share hint and record it as seen (the "Got it" action). */
  dismissCoach(): void;
  /** End an active tour because the user navigated away from the toured view. */
  endTour(): void;
  /** Close the share hint without recording it, so it can appear again ("Later"). */
  hideCoach(): void;
  /** Restart the product tour from step one. */
  replayTour(): void;
  /** Wipe persisted progress so both the tour and the hint are offered again. */
  resetAll(): void;
  /** Show the share hint again even if it was dismissed. */
  showShareHint(): void;
  /** Human-readable tour state for the status line. */
  readonly statusText: Readable<string>;
}

export interface MountOnboardingOptions {
  /** The `ore-tour` element that renders the coachmark (single step, custom footer). */
  coachCard: OreTourElement;
  /**
   * Live resolver for the navigation step's anchor. The shell owns it because
   * the navigation control differs per viewport: the sidebar group on desktop,
   * the sidebar's bottom bar on phones.
   */
  navigationTarget?: BeaconTargetResolver;
  /** Progress persistence; omit for in-memory-only (this session). */
  storage?: BeaconStorage;
  /** The `ore-tour` element that renders the product tour. */
  tourCard: OreTourElement;
}

/**
 * Bridges beacon handles to two `ore-tour` cards: one renders the multi-step
 * product tour, the other a single-step coachmark. Beacon owns the step logic
 * and persistence; the cards own the pixels. `card.bind(handle)` is the whole
 * bridge — snapshot in, actions out — so the app only adds what the card
 * cannot know: the welcome step's decorative media and the finish-then-hint
 * choreography.
 */
export function mountOnboarding(options: MountOnboardingOptions): OnboardingHandle {
  const { coachCard, navigationTarget, storage, tourCard } = options;
  const controller = new AbortController();

  // The shell may re-point the navigation step at a viewport-specific control;
  // every other step keeps its declared target.
  const steps = navigationTarget
    ? productTour.steps.map((step) => (step.id === 'navigation' ? { ...step, target: navigationTarget } : step))
    : productTour.steps;

  const tour = createTour({ ...productTour, autoStart: true, steps, storage });
  const coachmark = createCoachmark({ ...shareCoachmark, autoShow: false, storage });

  // ── Tour card ← controller ─────────────────────────────────────────────────
  // bind() renders the snapshot and routes the card's actions back into the
  // handle. The one thing it cannot do is the decorative SVG the welcome step
  // carries on `data`: Beacon never interprets that field, so the shell owns
  // turning it into a `slot="media"` child. The HTML parser (template.innerHTML)
  // namespaces <svg> correctly and keeps it a direct slotted element, which the
  // card's ::slotted(svg) rule then sizes.
  const syncMedia = (): void => {
    const markup = (tour.current.peek().step?.data as { media?: unknown } | undefined)?.media;

    tourCard.querySelector('[slot="media"]')?.remove();
    if (typeof markup !== 'string') return;

    const template = document.createElement('template');
    template.innerHTML = markup;

    const parsed = template.content.firstElementChild;

    if (!parsed || parsed.tagName.toLowerCase() !== 'svg') return;

    parsed.setAttribute('slot', 'media');
    tourCard.prepend(parsed);
  };

  const unsubscribeMedia = tour.current.subscribe(syncMedia);
  syncMedia();

  const unbindTour = tourCard.bind(tour);
  const unbindCoach = coachCard.bind(coachmark);

  // The hint earns its keep after the tour: finishing surfaces it, skipping does
  // not — a user who opted out of guidance has not earned another prompt.
  tour.tap(
    (event) => {
      if (event.type === 'tour:complete' && event.reason === 'finish') coachmark.show();
    },
    { signal: controller.signal },
  );

  const statusText = computed(() => {
    const status = tour.status.value;
    if (status === 'active') {
      const { stepIndex, totalSteps } = tour.current.value;

      return `Tour running — step ${Math.max(0, stepIndex) + 1} of ${totalSteps}.`;
    }
    if (status === 'completed') return 'Tour complete. The share hint points at the next thing to try.';
    if (status === 'dismissed') return 'Tour dismissed. Replay it any time from Getting started.';

    return '';
  });

  let disposed = false;

  return {
    dismissCoach() {
      coachmark.dismiss();
    },
    disposalSignal: controller.signal,
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      unbindTour();
      unbindCoach();
      unsubscribeMedia();
      coachmark.dispose();
      tour.dispose();
    },
    get disposed() {
      return disposed;
    },
    endTour() {
      if (tour.status.value === 'active') tour.dismiss();
    },
    hideCoach() {
      coachmark.hide();
    },
    replayTour() {
      tour.reset();
      tour.start();
    },
    resetAll() {
      tour.reset();
      coachmark.reset();
    },
    showShareHint() {
      coachmark.reset();
      coachmark.show();
    },
    statusText,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
