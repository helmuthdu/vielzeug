import { type BeaconStep, type BeaconStorage, type BeaconTourHandle, createTour } from '@vielzeug/beacon';
import { signal } from '@vielzeug/ripple';

/**
 * The Voyage product tour, powered by `@vielzeug/beacon`. Beacon is headless:
 * it owns step sequencing, persisted progress, and target waiting, while
 * `ore-tour` renders each step (see `ui/components/onboarding.ts`).
 *
 * The tour ships two step lists — one for the desktop shell, one for the
 * narrow shell — because the layouts differ enough that a single list anchors
 * badly: below {@link NARROW_QUERY} the sidebar folds into a bottom bar, the
 * desktop search form collapses into a navbar pill, and the destination grid
 * becomes a single tall column. The right list is chosen from the viewport
 * when the handle is created, and re-created if the viewport crosses the
 * breakpoint between tours.
 *
 * Steps anchor through `data-tour` attributes placed on the real elements, so
 * the tour keeps working when markup moves. Steps whose target lives in a
 * lazily-mounted view wait for it to mount: the user can navigate there mid-tour
 * and the tour picks the step up.
 */

const TOUR_ID = 'voyage-getting-started';
/** Bumped when the step lists change, so stale progress records are superseded. */
const TOUR_VERSION = 3;

/** How long a step waits for its target to mount before it is skipped. */
const TARGET_TIMEOUT_MS = 5000;

/** Height the sticky explore navbar covers at the top of the viewport. */
const STICKY_HEADER_OFFSET = 72;

/**
 * The layout breakpoint where the shell switches to its narrow form: the
 * sidebar becomes a bottom bar and the desktop search form collapses. Matches
 * the `bottom-nav-at` / navbar `breakpoint` the shell itself uses.
 */
const NARROW_QUERY = '(max-width: 680px)';

/** Progress records are JSON; keys are namespaced by beacon itself. */
const storage: BeaconStorage = {
  get: (key) => {
    try {
      return JSON.parse(globalThis.localStorage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  },
  remove: (key) => globalThis.localStorage.removeItem(key),
  set: (key, value) => globalThis.localStorage.setItem(key, JSON.stringify(value)),
};

/** Whether the current viewport uses the narrow (bottom-bar) shell. */
export function isNarrowViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(NARROW_QUERY).matches;
}

/**
 * Runs `onChange` whenever the viewport crosses {@link NARROW_QUERY}, and
 * returns a function that stops listening. A no-op returning `undefined` when
 * `matchMedia` is unavailable (server / node test runs).
 */
export function onViewportChange(onChange: () => void): (() => void) | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Desktop step list. The destinations step anchors to the first featured card
 * rather than the whole grid: on desktop the grid is ~2000px tall, so a
 * grid-sized spotlight covers the entire viewport and nothing reads as
 * highlighted. A single card fits the viewport on both layouts.
 */
const desktopSteps: readonly BeaconStep[] = [
  {
    description:
      'Plan a whole Japan trip in one place: search stays, follow an itinerary, and keep every booking at hand. This quick tour shows the four places you will use most.',
    id: 'welcome',
    title: 'Welcome to Voyage',
  },
  {
    description: 'Explore, Trips, and Bookings live in this rail — your way around Voyage.',
    id: 'navigation',
    placement: 'right-start',
    target: '[data-tour="sidebar"]',
    title: 'Find your way',
  },
  {
    description: 'The card below jumps straight to your upcoming itinerary — dates, route, and stays.',
    id: 'next-trip',
    placement: 'right',
    target: '[data-tour="next-trip"]',
    title: 'Your next trip, always one tap away',
  },
  {
    description:
      'Pick a destination and your dates here. Try Tokyo, Kyoto, or Hakone, then search stays and experiences.',
    id: 'search',
    placement: 'bottom',
    target: '[data-tour="search"]',
    title: 'Search a journey',
  },
  {
    description: 'Each destination opens its own guide: stays, experiences, and the season it shines in.',
    id: 'destinations',
    placement: 'top',
    target: '[data-tour="destination-card"]',
    title: 'Browse by destination',
  },
];

/**
 * Narrow (phone) step list. The navigation step is dropped: the bottom bar is
 * self-labelling, and the bottom-sheet card would cover it — the spotlight
 * would highlight the target behind the card itself. The search step anchors
 * the whole navbar pill (the summary text alone cuts a hard-edged hole across
 * the pill's rounded chrome); the next-trip step is dropped because it lives
 * in a closed drawer.
 */
const mobileSteps: readonly BeaconStep[] = [
  {
    description:
      'Plan a whole Japan trip in one place: search stays, follow an itinerary, and keep every booking at hand. This quick tour shows where everything lives.',
    id: 'welcome',
    title: 'Welcome to Voyage',
  },
  {
    description: 'Your destination and dates live here — tap the search icon to change them.',
    id: 'search',
    placement: 'bottom',
    target: '[data-tour="search-bar"]',
    title: 'Search a journey',
  },
  {
    description: 'Each destination opens its own guide: stays, experiences, and the season it shines in.',
    id: 'destinations',
    placement: 'top',
    target: '[data-tour="destination-card"]',
    title: 'Browse by destination',
  },
];

/** The step list for a given viewport class. Pure, so tests cover both lists. */
export function resolveOnboardingSteps(narrow: boolean): readonly BeaconStep[] {
  return narrow ? mobileSteps : desktopSteps;
}

let handle: BeaconTourHandle | null = null;
let handleNarrow = false;

/**
 * The live tour handle as a reactive value. It is `null` until the first
 * {@link getOnboardingTour} call and is swapped whenever the viewport crosses
 * {@link NARROW_QUERY} between tours, so the widget label and the `ore-tour`
 * host follow the active step list.
 */
export const tourHandle = signal<BeaconTourHandle | null>(null);

/**
 * The demo's single tour handle, created on first use (after the DOM exists).
 * If the viewport has since crossed the layout breakpoint, the handle is
 * re-created against the matching step list before it is returned.
 */
export function getOnboardingTour(): BeaconTourHandle {
  const narrow = isNarrowViewport();
  if (!handle || handle.disposed || narrow !== handleNarrow) {
    handle?.dispose();
    handle = createTour({
      id: TOUR_ID,
      presentation: 'auto',
      scrollOffset: STICKY_HEADER_OFFSET,
      steps: resolveOnboardingSteps(narrow),
      storage,
      targetTimeoutMs: TARGET_TIMEOUT_MS,
      version: TOUR_VERSION,
    });
    handleNarrow = narrow;
    tourHandle.value = handle;
  }
  return handle;
}

/**
 * Start the tour from the panel widget. A finished or dismissed tour restarts
 * from step 1 (beacon persists both as ended, so resuming is impossible);
 * a paused tour — one left half-finished on a previous visit — resumes where
 * it stopped.
 */
export function startOnboardingTour(): void {
  const tour = getOnboardingTour();
  const status = tour.status.peek();
  if (status === 'completed' || status === 'dismissed') tour.reset();
  tour.start();
}
