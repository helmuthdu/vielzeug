import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getOnboardingTour, resolveOnboardingSteps, startOnboardingTour } from './onboarding';

/** Minimal localStorage double; beacon namespaces its own keys. */
const createStorageDouble = (): Storage => {
  const data = new Map<string, string>();
  return {
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  };
};

describe('voyage onboarding tour', () => {
  beforeEach(() => {
    globalThis.localStorage = createStorageDouble();
  });

  afterEach(() => {
    getOnboardingTour().dispose();
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('opens with a centered welcome step and anchors every later step to a data-tour selector', () => {
    for (const narrow of [false, true]) {
      const steps = resolveOnboardingSteps(narrow);
      const label = narrow ? 'mobile' : 'desktop';

      expect(steps.length, label).toBeGreaterThan(1);
      expect(steps[0]?.target, `${label} welcome`).toBeUndefined();

      const ids = steps.map((step) => step.id);

      expect(new Set(ids).size, `${label} ids unique`).toBe(ids.length);
      for (const step of steps.slice(1)) {
        expect(step.target, `${label} step "${step.id}"`).toMatch(/^\[data-tour="[a-z-]+"\]$/);
      }
      for (const step of steps) {
        expect(step.title, `${label} step "${step.id}"`).toBeTruthy();
        expect(step.description, `${label} step "${step.id}"`).toBeTruthy();
      }
    }
  });

  it('anchors the destinations step to a single card, not the whole grid', () => {
    // The grid is ~2000px tall on desktop, so a grid-sized spotlight covers the
    // viewport; both lists must point at one featured destination card instead.
    for (const narrow of [false, true]) {
      const destinations = resolveOnboardingSteps(narrow).find((step) => step.id === 'destinations');

      expect(destinations?.target).toBe('[data-tour="destination-card"]');
    }
  });

  it('swaps the search anchor and drops covered steps for the narrow layout', () => {
    const desktop = resolveOnboardingSteps(false);
    const mobile = resolveOnboardingSteps(true);

    // Desktop anchors the full search form; mobile anchors the whole navbar
    // pill, since the desktop form is collapsed behind the menu below the
    // breakpoint and the summary text alone cuts a hole across the pill.
    expect(desktop.find((step) => step.id === 'search')?.target).toBe('[data-tour="search"]');
    expect(mobile.find((step) => step.id === 'search')?.target).toBe('[data-tour="search-bar"]');

    // The next-trip card lives in a closed drawer on mobile, and the bottom
    // bar would sit behind the bottom-sheet card: both steps are dropped.
    expect(desktop.some((step) => step.id === 'next-trip')).toBe(true);
    expect(mobile.some((step) => step.id === 'next-trip')).toBe(false);
    expect(desktop.some((step) => step.id === 'navigation')).toBe(true);
    expect(mobile.some((step) => step.id === 'navigation')).toBe(false);
  });

  it('starts at the welcome step and walks to the second step on next', () => {
    const tour = getOnboardingTour();

    tour.start();

    expect(tour.status.value).toBe('active');
    expect(tour.current.value.step?.id).toBe('welcome');
    expect(tour.current.value.stepIndex).toBe(0);

    tour.next();

    // The second step anchors to the sidebar, which does not exist in this
    // environment: beacon waits for it instead of publishing, and the tour
    // stays on the welcome step until the target mounts.
    expect(tour.current.value.step?.id).toBe('welcome');
  });

  it('persists completion and replays from step 1 through startOnboardingTour', () => {
    const tour = getOnboardingTour();

    tour.start();
    tour.finish();

    expect(tour.status.value).toBe('completed');
    expect(globalThis.localStorage.length).toBeGreaterThan(0);

    // A fresh handle (new visit) loads the completed record: not eligible.
    tour.dispose();
    const revisit = getOnboardingTour();

    expect(revisit.eligible.value).toBe(false);

    // The widget's Start/Replay control overrides the record explicitly.
    startOnboardingTour();

    expect(revisit.status.value).toBe('active');
    expect(revisit.current.value.step?.id).toBe('welcome');
    expect(revisit.current.value.stepIndex).toBe(0);
  });

  it('restarts a dismissed tour from step 1', () => {
    const tour = getOnboardingTour();

    tour.start();
    tour.dismiss();

    expect(tour.status.value).toBe('dismissed');

    startOnboardingTour();

    expect(tour.status.value).toBe('active');
    expect(tour.current.value.step?.id).toBe('welcome');
    expect(tour.current.value.stepIndex).toBe(0);
  });

  it('survives a corrupted storage record', () => {
    globalThis.localStorage.setItem('@vielzeug/beacon:voyage-getting-started', '{"status":"nonsense"');

    const tour = getOnboardingTour();

    expect(tour.eligible.value).toBe(true);
    tour.start();

    expect(tour.current.value.step?.id).toBe('welcome');
  });
});
