import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/icons/lucide/all';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/spotlight';
import '@vielzeug/refine/tour';
import { define, each, getHost, html, onCleanup, onMounted } from '@vielzeug/ore';
import type { OreTourElement } from '@vielzeug/refine/tour';
import { signal } from '@vielzeug/ripple';
import { createLocalBeaconStorage } from '../core/storage';
import { setTheme, theme } from '../core/theme';
import { mountOnboarding, type OnboardingHandle } from './onboarding';

type ViewId = 'boards' | 'events' | 'reports';

interface Tile {
  id: string;
  metric: string;
  pinned: boolean;
  value: string;
}

interface StreamEvent {
  detail: string;
  icon: string;
  id: number;
  time: string;
  tone: 'info' | 'success' | 'warning';
}

interface Report {
  cadence: string;
  id: string;
  name: string;
  owner: string;
}

const tiles = signal<Tile[]>([
  { id: 'sessions', metric: 'Sessions today', pinned: true, value: '18,402' },
  { id: 'conversion', metric: 'Conversion', pinned: false, value: '3.8%' },
  { id: 'latency', metric: 'p95 latency', pinned: false, value: '212 ms' },
  { id: 'errors', metric: 'Error rate', pinned: false, value: '0.42%' },
  { id: 'revenue', metric: 'Revenue (24h)', pinned: true, value: '€41,208' },
  { id: 'queue', metric: 'Queue depth', pinned: false, value: '7' },
]);

const pinnedCount = signal(2);
const activeView = signal<ViewId>('boards');
const statusText = signal('');

const refreshPinnedCount = (): void => {
  pinnedCount.value = tiles.value.filter((tile) => tile.pinned).length;
};

const togglePin = (id: string): void => {
  tiles.value = tiles.value.map((tile) => (tile.id === id ? { ...tile, pinned: !tile.pinned } : tile));
  refreshPinnedCount();
};

// The board claims to be live, so it should look live: a slow drift on the
// counters sells "real-time" without pretending the numbers mean anything.
const drift = (value: string, delta: number): string => {
  const digits = Number.parseFloat(value.replace(/[^\d.]/g, ''));

  if (!Number.isFinite(digits)) return value;

  const next = Math.max(0, digits + delta);

  return value.replace(/[\d.,]+/, (match) =>
    match.includes(',') ? Math.round(next).toLocaleString('en-US') : next.toFixed(match.includes('.') ? 2 : 0),
  );
};

const tickMetrics = (): void => {
  tiles.value = tiles.value.map((tile) => {
    if (tile.id === 'sessions') return { ...tile, value: drift(tile.value, Math.ceil(Math.random() * 40)) };
    if (tile.id === 'revenue') return { ...tile, value: drift(tile.value, Math.ceil(Math.random() * 400)) };
    if (tile.id === 'queue') return { ...tile, value: drift(tile.value, Math.random() > 0.5 ? 1 : -1) };

    return tile;
  });
};

const clock = (agoSeconds = 0): string =>
  new Date(Date.now() - agoSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const eventSeed: Omit<StreamEvent, 'id' | 'time'>[] = [
  { detail: 'checkout-e2e flagged 3 slow responses', icon: 'alert-triangle', tone: 'warning' },
  { detail: 'Board "Product analytics" shared with 4 teammates', icon: 'share-2', tone: 'info' },
  { detail: 'Deploy 4f2c1a promoted to production', icon: 'rocket', tone: 'success' },
  { detail: 'Conversion crossed its 7-day high', icon: 'trending-up', tone: 'success' },
  { detail: 'Queue depth back under its alert line', icon: 'check-circle', tone: 'success' },
  { detail: 'Nightly report delivered to #analytics', icon: 'mail', tone: 'info' },
];

let eventId = 0;

const events = signal<StreamEvent[]>(
  eventSeed.map((seed, index) => ({ ...seed, id: ++eventId, time: clock((index + 1) * 47) })),
);

const pushEvent = (): void => {
  const seed = eventSeed[Math.floor(Math.random() * eventSeed.length)];

  events.value = [{ ...seed, id: ++eventId, time: clock() }, ...events.value].slice(0, 8);
};

const reports: Report[] = [
  { cadence: 'Daily · 07:00', id: 'funnel', name: 'Signup funnel', owner: 'Maya' },
  { cadence: 'Weekly · Mon', id: 'latency', name: 'Latency budget', owner: 'Tomas' },
  { cadence: 'Weekly · Mon', id: 'revenue', name: 'Revenue by plan', owner: 'Ines' },
  { cadence: 'Monthly', id: 'churn', name: 'Churn post-mortem', owner: 'Ada' },
];

const views: { icon: string; id: ViewId; label: string }[] = [
  { icon: 'layout-dashboard', id: 'boards', label: 'Boards' },
  { icon: 'activity', id: 'events', label: 'Events' },
  { icon: 'file-bar-chart', id: 'reports', label: 'Reports' },
];

const viewHead: Record<ViewId, { eyebrow: string; subtitle: string; title: string }> = {
  boards: {
    eyebrow: 'LIVE BOARD',
    subtitle:
      'A fictional workspace. The guided tour and the share hint are real @vielzeug/beacon flows over ore-tour.',
    title: 'Product analytics',
  },
  events: {
    eyebrow: 'LIVE STREAM',
    subtitle: 'Everything Signalbox notices, as it happens. New events land at the top of the list.',
    title: 'Event stream',
  },
  reports: {
    eyebrow: 'SAVED',
    subtitle: 'Reports run on their own schedule and land in your inbox or channel.',
    title: 'Reports',
  },
};

define('onboarding-shell', {
  setup() {
    const host = getHost();
    let handle: OnboardingHandle | null = null;

    // Switching away from the toured view ends the tour: its remaining steps
    // anchor to board controls that just left the screen, and beacon would wait
    // for them to return. Ending is the honest state — the controls offer a replay.
    const selectView = (id: ViewId): void => {
      if (id === activeView.value) return;

      activeView.value = id;
      handle?.endTour();
    };

    // Beacon needs the two <ore-tour> cards in the tree before it can drive
    // them, so wiring happens after the first mount, not during setup.
    onMounted(() => {
      const tourCard = host.querySelector<OreTourElement>('#tour-card');
      const coachCard = host.querySelector<OreTourElement>('#coach-card');

      if (!tourCard || !coachCard) return;

      handle = mountOnboarding({
        coachCard,
        storage: createLocalBeaconStorage(),
        tourCard,
      });

      const unsubscribe = handle.statusText.subscribe(() => {
        statusText.value = handle?.statusText.value ?? '';
      });
      statusText.value = handle.statusText.value;

      return () => {
        unsubscribe();
        handle?.dispose();
        handle = null;
      };
    });

    const metricTimer = window.setInterval(tickMetrics, 3000);
    const eventTimer = window.setInterval(pushEvent, 5000);

    onCleanup(() => {
      window.clearInterval(metricTimer);
      window.clearInterval(eventTimer);
      handle?.dispose();
    });

    const navItem = (view: (typeof views)[number]) => html`
      <ore-navbar-item ?active=${() => activeView.value === view.id} @click=${() => selectView(view.id)}>
        <ore-icon slot="icon" name=${view.icon} size="18" aria-hidden="true"></ore-icon>
        ${view.label}
      </ore-navbar-item>
    `;

    const tileCard = (item: { value: Tile }, isTourTarget: boolean) => html`
      <ore-card class="tile" padding="lg" variant="flat">
        <div class="tile__head" slot="header">
          <span class="tile__metric">${() => item.value.metric}</span>
          <button
            class="tile__pin"
            type="button"
            data-tour=${isTourTarget ? 'pinned-tile' : null}
            aria-label=${() => (item.value.pinned ? `Unpin ${item.value.metric}` : `Pin ${item.value.metric}`)}
            aria-pressed=${() => String(item.value.pinned)}
            @click=${() => togglePin(item.value.id)}>
            <ore-icon aria-hidden="true" name=${() => (item.value.pinned ? 'star' : 'star-off')} size="16"></ore-icon>
          </button>
        </div>
        <strong class="tile__value">${() => item.value.value}</strong>
      </ore-card>
    `;

    const eventRow = (item: { value: StreamEvent }) => html`
      <ore-list-item>
        <ore-icon
          slot="leading"
          class=${`event__icon event__icon--${item.value.tone}`}
          name=${item.value.icon}
          size="18"
          aria-hidden="true"></ore-icon>
        <span class="event__detail">${item.value.detail}</span>
        <span slot="description">signalbox / production</span>
        <span slot="trailing" class="event__time">${item.value.time}</span>
      </ore-list-item>
    `;

    const reportRow = (report: Report) => html`
      <ore-list-item>
        <ore-icon slot="leading" name="file-bar-chart" size="18" aria-hidden="true"></ore-icon>
        <span>${report.name}</span>
        <span slot="description">${report.owner}</span>
        <span slot="trailing" class="report__cadence">${report.cadence}</span>
      </ore-list-item>
    `;

    const boardsView = () => html`
      <section class="board" data-tour="board" aria-label="Metrics board">
        <div class="board__bar">
          <ore-badge color="primary" variant="flat">${() => `${pinnedCount.value} pinned`}</ore-badge>
          <span class="board__hint">
            <ore-icon name="mouse-pointer-click" size="14" aria-hidden="true"></ore-icon>
            Pin a tile with the star
          </span>
        </div>
        <ore-grid cols="1" cols-lg="3" cols-sm="2" gap="md">
          ${each(
            tiles,
            (tile) => tile.id,
            (item, index) => tileCard(item, index.value === 0),
          )}
        </ore-grid>
      </section>
    `;

    const eventsView = () => html`
      <section class="stream" aria-label="Event stream">
        <ore-list variant="separated">
          ${each(
            events,
            (event) => event.id,
            (item) => eventRow(item),
          )}
        </ore-list>
      </section>
    `;

    const reportsView = () => html`
      <section class="stream" aria-label="Saved reports">
        <ore-list variant="separated">${reports.map(reportRow)}</ore-list>
      </section>
    `;

    return html`
      <div class="shell">
        <ore-navbar
          class="shell__nav"
          label="Signalbox"
          elevation="1"
          rounded="none"
          sticky
          breakpoint="(max-width: 720px)"
          menu-label="Open navigation">
          <span class="brand" slot="logo">
            <span class="brand__mark" aria-hidden="true"><ore-icon name="radar" size="18"></ore-icon></span>
            Signalbox
          </span>
          <!-- The navigation step anchors to the items themselves, not the bar:
               a full-width bar would put a bottom-start card in the far gutter
               and ring the whole header. A plain wrapper keeps the items' navbar
               context (injection walks the DOM ancestors, slots included). -->
          <div class="nav-items" data-tour="navigation">${views.map(navItem)}</div>
          <!-- The navbar collapses below its breakpoint and hides the default
               (center) and end regions. mobile-menu content brings back a
               hamburger with a stacked copy of the items; persistent survives
               the collapse, so Share/theme stay tappable on phones, which also
               keeps the share coachmark's anchor a real on-screen rect. -->
          <div class="nav-mobile" slot="mobile-menu">
            ${views.map(navItem)}
          </div>
          <div class="nav-actions" slot="persistent">
            <ore-button data-tour="share" size="sm" variant="ghost" @click=${() => handle?.showShareHint()}>
              <ore-icon slot="prefix" name="share-2" size="16" aria-hidden="true"></ore-icon>
              Share
            </ore-button>
            <ore-button
              class="theme-toggle"
              size="sm"
              variant="ghost"
              icon-only
              label=${() => (theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')}
              @click=${() => setTheme(theme.value === 'dark' ? 'light' : 'dark')}>
              <ore-icon name=${() => (theme.value === 'dark' ? 'sun' : 'moon')} size="16" aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
        </ore-navbar>

        <main class="page">
          <header class="page__head">
            <div>
              <span class="eyebrow">${() => viewHead[activeView.value].eyebrow}</span>
              <h1>${() => viewHead[activeView.value].title}</h1>
              <p>${() => viewHead[activeView.value].subtitle}</p>
            </div>
            ${() =>
              activeView.value === 'boards'
                ? html`
                    <ore-button
                      class="add-tile"
                      data-tour="add-tile"
                      color="primary"
                      @click=${() =>
                        (tiles.value = [
                          ...tiles.value,
                          {
                            id: `tile-${Date.now()}`,
                            metric: 'New metric',
                            pinned: false,
                            value: '—',
                          },
                        ])}>
                      <ore-icon slot="prefix" name="plus" size="18" aria-hidden="true"></ore-icon>
                      Add tile
                    </ore-button>
                  `
                : ''}
          </header>

          ${() =>
            activeView.value === 'boards' ? boardsView() : activeView.value === 'events' ? eventsView() : reportsView()}

          <section class="controls" aria-labelledby="controls-title">
            <div class="controls__body">
              <span class="controls__icon" aria-hidden="true"><ore-icon name="compass" size="18"></ore-icon></span>
              <div>
                <h2 id="controls-title">Tour controls</h2>
                <p>
                  Progress is stored in <code>localStorage</code>, so a reload keeps the tour completed until you reset
                  it. While it runs, <kbd>←</kbd> / <kbd>→</kbd> step through it and <kbd>Esc</kbd> closes it.
                </p>
              </div>
            </div>
            <div class="controls__row">
              <ore-button
                color="primary"
                variant="flat"
                @click=${() => {
                  // Steps 3-5 anchor to board controls, so replaying from
                  // Events or Reports would wait forever on targets that never
                  // mount. Return to the toured view first; selectView is a
                  // no-op when already there, and replayTour restarts either way.
                  selectView('boards');
                  handle?.replayTour();
                }}>
                <ore-icon slot="prefix" name="rotate-ccw" size="16" aria-hidden="true"></ore-icon>
                Replay tour
              </ore-button>
              <ore-button variant="flat" @click=${() => handle?.showShareHint()}>
                <ore-icon slot="prefix" name="lightbulb" size="16" aria-hidden="true"></ore-icon>
                Show share hint
              </ore-button>
              <ore-button variant="ghost" @click=${() => handle?.resetAll()}>
                <ore-icon slot="prefix" name="eraser" size="16" aria-hidden="true"></ore-icon>
                Reset progress
              </ore-button>
            </div>
            <p class="status" role="status" aria-live="polite">${() => statusText.value}</p>
          </section>
        </main>

        <ore-tour id="tour-card" spotlight></ore-tour>

        <ore-tour id="coach-card" presentation="popover" placement="bottom-end">
          <div slot="footer" class="coach__footer">
            <ore-button size="sm" variant="ghost" @click=${() => handle?.hideCoach()}>Not now</ore-button>
            <ore-button color="primary" size="sm" @click=${() => handle?.dismissCoach()}>Got it</ore-button>
          </div>
        </ore-tour>
      </div>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  return document.createElement('onboarding-shell');
}
