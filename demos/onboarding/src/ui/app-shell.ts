import '@vielzeug/refine/avatar';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/box';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/icons/lucide/all';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/menu';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/sidebar';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/table';
import '@vielzeug/refine/tour';
import { define, each, getHost, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import type { ChartHandle } from '@vielzeug/prism';
import { createLineChart } from '@vielzeug/prism';
import type { MenuSelectDetail } from '@vielzeug/refine/menu';
import type { SidebarElement } from '@vielzeug/refine/sidebar';
import type { OreTourElement } from '@vielzeug/refine/tour';
import { computed, signal } from '@vielzeug/ripple';
import {
  type BoardMetric,
  boardMetrics,
  eventSeed,
  fmt,
  type MetricId,
  reportRows,
  type StreamEvent,
} from '../core/data';
import { createLocalBeaconStorage } from '../core/storage';
import { setTheme, theme } from '../core/theme';
import { mountOnboarding, type OnboardingHandle } from './onboarding';

type ViewId = 'boards' | 'events' | 'reports';

interface ReportRow {
  cadence: string;
  delivered: string;
  id: string;
  lastRun: string;
  name: string;
  nextRun: string;
  owner: string;
}

const views: { icon: string; id: ViewId; label: string }[] = [
  { icon: 'layout-dashboard', id: 'boards', label: 'Boards' },
  { icon: 'activity', id: 'events', label: 'Events' },
  { icon: 'file-bar-chart', id: 'reports', label: 'Reports' },
];

const viewTitle: Record<ViewId, string> = {
  boards: 'Product analytics',
  events: 'Event stream',
  reports: 'Reports',
};

const clock = (agoSeconds = 0): string =>
  new Date(Date.now() - agoSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// Prism's line scale accepts numeric keys, so the hourly series is charted at
// its index and the axis prints the clock hour the index stands for.
const hourTickFormat = (value: number): string => `${String(value + 9).padStart(2, '0')}:00`; // taste-skill-ignore: clock hour, not a step label

let eventId = 0;

define('onboarding-shell', {
  setup() {
    const host = getHost();
    const chartBox = ref<HTMLElement>();
    let handle: OnboardingHandle | null = null;
    let chart: ChartHandle | null = null;
    // The container the handle was built against, so a replaced container is
    // detected rather than silently updated while detached.
    let chartHost: HTMLElement | null = null;

    // ── State ────────────────────────────────────────────────────────────────
    // The board's metrics are mutable copies: the live drift rewrites the last
    // point of a series, and the tile figure is always that last point.
    const metrics = signal<BoardMetric[]>(boardMetrics.map((metric) => ({ ...metric })));
    const selectedId = signal<MetricId>('latency');
    const pinnedIds = signal<string[]>(['sessions', 'revenue']);
    const activeView = signal<ViewId>('boards');
    const statusText = signal('');
    const updated = signal(clock());

    const events = signal<StreamEvent[]>(
      eventSeed.map((seed, index) => ({ ...seed, id: ++eventId, time: clock((index + 1) * 47) })),
    );
    const reports = signal<ReportRow[]>([...reportRows]);

    const selectedMetric = computed(
      () => metrics.value.find((metric) => metric.id === selectedId.value) ?? metrics.value[0],
    );
    const isPinned = (id: string): boolean => pinnedIds.value.includes(id);
    const activeLabel = computed(() => views.find((view) => view.id === activeView.value)?.label ?? '');

    const selectView = (id: ViewId): void => {
      if (id === activeView.value) return;

      activeView.value = id;
      // Switching away from the toured view ends the tour: its remaining steps
      // anchor to board controls that just left the screen, and beacon would
      // wait for them to return. Ending is the honest state; the sidebar widget
      // replays.
      handle?.endTour();
      scheduleChart();
    };

    const selectMetric = (id: MetricId): void => {
      selectedId.value = id;
      scheduleChart();
    };

    const togglePin = (id: string): void => {
      pinnedIds.value = isPinned(id) ? pinnedIds.value.filter((pinned) => pinned !== id) : [...pinnedIds.value, id];
    };

    const addTile = (): void => {
      const id = `metric-${Date.now()}` as MetricId;

      metrics.value = [...metrics.value, { format: fmt.int, id, name: 'New metric', series: [], value: Number.NaN }];
      selectMetric(id);
    };

    const addReport = (): void => {
      reports.value = [
        ...reports.value,
        {
          cadence: 'Daily · 07:00',
          delivered: 'You',
          id: `report-${Date.now()}`,
          lastRun: '—',
          name: 'Untitled report',
          nextRun: 'Tomorrow 07:00',
          owner: 'You',
        },
      ];
    };

    // The workspace menu only holds actions the demo really performs: the
    // three tour controls, same handlers the sidebar widget uses.
    const onAccountSelect = (event: Event): void => {
      const { value } = (event as CustomEvent<MenuSelectDetail>).detail;

      if (value === 'replay-tour') {
        selectView('boards');
        handle?.replayTour();
      } else if (value === 'share-hint') {
        handle?.showShareHint();
      } else if (value === 'reset') {
        handle?.resetAll();
      }
    };

    // The board claims to be live, so the counters drift: the last point of a
    // series moves with its tile figure, and the chart re-renders to match.
    const drift = (id: MetricId, delta: number): void => {
      metrics.value = metrics.value.map((metric) => {
        if (metric.id !== id || metric.series.length === 0) return metric;

        const next = Math.max(0, metric.value + delta);
        const series = [...metric.series];

        series[series.length - 1] = next;

        return { ...metric, series, value: next };
      });
      scheduleChart();
    };

    const tickMetrics = (): void => {
      drift('sessions', Math.ceil(Math.random() * 40));
      drift('revenue', Math.ceil(Math.random() * 400));
      drift('queue', Math.random() > 0.5 ? 1 : -1);
      updated.value = clock();
    };

    const pushEvent = (): void => {
      const seed = eventSeed[Math.floor(Math.random() * eventSeed.length)];

      events.value = [{ ...seed, id: ++eventId, time: clock() }, ...events.value].slice(0, 8);
    };

    // ── Chart rendering ──────────────────────────────────────────────────────
    // Prism owns the chart: one handle, updated (never rebuilt) on selection and
    // drift, and rebuilt only when the container itself is replaced. Rendering is
    // deferred a macrotask so ore's DOM updates have landed and the container has
    // width.
    const chartSeries = (metric: BoardMetric) => ({
      color: 'var(--color-primary)',
      curve: 'linear' as const,
      data: metric.series.map((value, key) => ({ key, value })),
      name: metric.name,
      showPoints: true,
    });

    const renderChart = (): void => {
      const container = chartBox.value;

      if (!container) return;

      const metric = selectedMetric.value;

      if (!metric || metric.series.length === 0) {
        chart?.dispose();
        chart = null;
        chartHost = null;
        container.innerHTML = '<p class="chart-empty">No data in this range yet.</p>';

        return;
      }

      // Leaving and returning to the board re-creates the panel, so the handle
      // can outlive its container: updating a detached node would leave the
      // panel blank for good. A new container means a new chart.
      if (chart && chartHost !== container) {
        chart.dispose();
        chart = null;
      }

      if (!chart) {
        container.textContent = '';
        chart = createLineChart(container, {
          a11y: { ariaLabel: `${metric.name}, hourly from 09:00 to 22:00` },
          series: [chartSeries(metric)],
          tooltip: { valueFormat: (value) => metric.format(value) },
          xAxis: { grid: false, tickCount: 5, tickFormat: (value) => hourTickFormat(value as number) },
          yAxis: { grid: true },
        });
        chartHost = container;

        return;
      }

      chart.update([chartSeries(metric)]);
    };

    function scheduleChart(): void {
      window.setTimeout(renderChart, 0);
    }

    // ── Onboarding wiring ────────────────────────────────────────────────────
    // Beacon needs the two <ore-tour> cards in the tree before it can drive
    // them, so wiring happens after the first mount, not during setup.
    onMounted(() => {
      const tourCard = host.querySelector<OreTourElement>('#tour-card');
      const coachCard = host.querySelector<OreTourElement>('#coach-card');

      if (!tourCard || !coachCard) return;

      // The navigation step anchors to the sidebar group on desktop and to the
      // sidebar's bottom bar on phones, where the group lives in the drawer.
      const navigationTarget = (): Element | null => {
        if (!window.matchMedia('(max-width: 720px)').matches) {
          return host.querySelector('#nav-group');
        }

        return host.querySelector<SidebarElement>('.side')?.shadowRoot?.querySelector('.bottom-bar') ?? null;
      };

      handle = mountOnboarding({
        coachCard,
        navigationTarget,
        storage: createLocalBeaconStorage(),
        tourCard,
      });

      const unsubscribe = handle.statusText.subscribe(() => {
        statusText.value = handle?.statusText.value ?? '';
      });
      statusText.value = handle.statusText.value;

      scheduleChart();

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
      chart?.dispose();
      chart = null;
      chartHost = null;
    });

    // ── Fragments ────────────────────────────────────────────────────────────
    // bottom-nav promotes each item into the sidebar's phone bottom bar: items
    // nested in a group are only picked up when they carry the attribute.
    const navItem = (view: (typeof views)[number]) => html`
      <ore-sidebar-item
        bottom-nav
        bottom-nav-label=${view.label}
        ?active=${() => activeView.value === view.id}
        @click=${() => selectView(view.id)}>
        <ore-icon slot="icon" name=${view.icon} size="18" aria-hidden="true"></ore-icon>
        ${view.label}
      </ore-sidebar-item>
    `;

    const formatValue = (metric: BoardMetric): string =>
      Number.isFinite(metric.value) ? metric.format(metric.value) : '—';

    // Each metric is a button wrapping an ore-stats cell: the button carries the
    // keyboard focus and the selected/pressed state, the stats carries the label
    // and figure. Clicking the cell selects the metric the panel below charts.
    const metricCell = (item: { value: BoardMetric }, isFirst: boolean) => {
      const metric = item.value;

      return html`
        <div class="kpi" data-selected=${() => (selectedId.value === metric.id ? 'true' : null)}>
          <button
            class="kpi__stats"
            type="button"
            aria-pressed=${() => String(selectedId.value === metric.id)}
            @click=${() => selectMetric(metric.id)}>
            <ore-stats label=${metric.name} size="sm" value=${() => formatValue(metric)} variant="plain"></ore-stats>
          </button>
          <button
            class="kpi__pin"
            type="button"
            data-tour=${isFirst ? 'pinned-tile' : null}
            aria-label=${() => (isPinned(metric.id) ? `Unpin ${metric.name}` : `Pin ${metric.name}`)}
            aria-pressed=${() => String(isPinned(metric.id))}
            @click=${() => togglePin(metric.id)}>
            <ore-icon
              aria-hidden="true"
              name=${() => (isPinned(metric.id) ? 'star' : 'star-off')}
              size="16"></ore-icon>
          </button>
        </div>
      `;
    };

    const eventRow = (item: { value: StreamEvent }) => html`
      <ore-list-item>
        <ore-icon slot="leading" class="event__icon" name=${item.value.icon} size="18" aria-hidden="true"></ore-icon>
        <span class="event__detail">${item.value.detail}</span>
        <span slot="description">signalbox-labs / production</span>
        <span slot="trailing" class="event__time num">${item.value.time}</span>
      </ore-list-item>
    `;

    const freshness = () => html`<span class="fresh num">Updated ${() => updated.value}</span>`;

    // ── Views ────────────────────────────────────────────────────────────────
    const boardsView = () => html`
      <div class="lead">
        <p class="lead__finding">
          p95 latency sits 12 ms over its 200 ms budget after the 4f2c1a deploy at 18:00.
        </p>
        <div class="lead__side">
          ${freshness()}
          <ore-button class="add-tile" color="primary" data-tour="add-tile" @click=${addTile}>
            <ore-icon slot="prefix" name="plus" size="16" aria-hidden="true"></ore-icon>
            Add tile
          </ore-button>
        </div>
      </div>

      <section class="tray" data-tour="board" aria-label="Metrics board">
        <ore-grid
          class="tray__strip"
          cols="2"
          cols-sm="3"
          cols-lg="6"
          gap="none"
          role="group"
          aria-label="Board metrics, pick one to chart">
          ${each(
            metrics,
            (metric) => metric.id,
            (item, index) => metricCell(item, index.value === 0),
          )}
        </ore-grid>
        <ore-card class="panel panel--chart" padding="none" variant="flat">
          <div slot="header" class="panel__head">
            <div class="panel__figure">
              <h2 class="panel__title">${() => selectedMetric.value.name}</h2>
              <strong class="panel__value num">${() => formatValue(selectedMetric.value)}</strong>
            </div>
            <span class="panel__meta">Hourly · 09:00-22:00</span>
          </div>
          <div class="panel__chart" ref=${chartBox}></div>
        </ore-card>
      </section>

      <ore-card class="panel" padding="none" variant="flat">
        <div slot="header" class="panel__head">
          <h2 class="panel__title">Recent activity</h2>
          <ore-button size="sm" variant="ghost" @click=${() => selectView('events')}>View all</ore-button>
        </div>
        <ore-list class="rows rows--compact" variant="bordered">
          ${each(
            () => events.value.slice(0, 5),
            (event) => event.id,
            (item) => eventRow(item),
          )}
        </ore-list>
      </ore-card>
    `;

    const eventsView = () => html`
      <div class="lead">
        <p class="lead__finding">New events land at the top of the stream.</p>
        <div class="lead__side">${freshness()}</div>
      </div>
      <ore-card class="panel" padding="none" variant="flat">
        <div slot="header" class="panel__head">
          <h2 class="panel__title">Event stream</h2>
          <span class="panel__meta">${() => `${events.value.length} events`} · signalbox-labs / production</span>
        </div>
        <ore-list class="rows" variant="bordered">
          ${each(
            events,
            (event) => event.id,
            (item) => eventRow(item),
          )}
        </ore-list>
      </ore-card>
    `;

    const reportsView = () => html`
      <div class="lead">
        <p class="lead__finding">${() => `${reports.value.length} reports run on their schedule.`}</p>
        <div class="lead__side">
          <ore-button color="primary" @click=${addReport}>
            <ore-icon slot="prefix" name="plus" size="16" aria-hidden="true"></ore-icon>
            Add report
          </ore-button>
        </div>
      </div>
      <ore-grid
        class="reports"
        areas="'table' 'aside'"
        areas-md="'table table aside'"
        cols="1"
        cols-md="3"
        gap="md"
        align="start">
        <ore-card class="panel reports__table" padding="none" variant="flat">
          <div slot="header" class="panel__head">
            <h2 class="panel__title">Saved reports</h2>
            <span class="panel__meta">${() => `${reports.value.length} reports`}</span>
          </div>
          <ore-table class="report-table" density="cozy">
            <ore-tr head>
              <ore-th>Report</ore-th>
              <ore-th>Cadence</ore-th>
              <ore-th>Last run</ore-th>
              <ore-th>Next run</ore-th>
              <ore-th>Delivered to</ore-th>
            </ore-tr>
            ${each(
              reports,
              (report) => report.id,
              (item) => html`
                <ore-tr>
                  <ore-td>
                    <span class="report-table__name">${item.value.name}</span>
                    <span class="report-table__sub">${item.value.owner}</span>
                  </ore-td>
                  <ore-td>${item.value.cadence}</ore-td>
                  <ore-td>${item.value.lastRun}</ore-td>
                  <ore-td>${item.value.nextRun}</ore-td>
                  <ore-td>${item.value.delivered}</ore-td>
                </ore-tr>
              `,
            )}
          </ore-table>
        </ore-card>
        <ore-card class="panel reports__aside" padding="none" variant="flat">
          <div slot="header" class="panel__head">
            <h2 class="panel__title">This week</h2>
          </div>
          <ore-box class="well-box" padding="md">
            <dl class="well">
              <div class="well__row">
                <dt>Runs delivered</dt>
                <dd class="num">2</dd>
              </div>
              <div class="well__row">
                <dt>Next delivery</dt>
                <dd class="num">Mon 26 Oct</dd>
              </div>
              <div class="well__row">
                <dt>Owners</dt>
                <dd class="num">${() => new Set(reports.value.map((report) => report.owner)).size}</dd>
              </div>
            </dl>
          </ore-box>
        </ore-card>
      </ore-grid>
    `;

    // The tour controls live in the sidebar footer: a permanent widget on the
    // navigation rail, not content that scrolls away with the page. On phones
    // the footer rides inside the drawer and the navbar's workspace menu keeps
    // the same three actions reachable.
    const tourWidget = () => html`
      <div slot="footer" class="getting">
        <h2 class="getting__title">Getting started</h2>
        <p class="getting__desc">Five steps over the board, about 40 seconds.</p>
        <div class="getting__actions">
          <ore-button
            class="getting__btn"
            size="sm"
            variant="ghost"
            @click=${() => {
              // Steps anchor to board controls, so replaying from another view
              // would wait on targets that never mount. Return first.
              selectView('boards');
              handle?.replayTour();
            }}>
            <ore-icon slot="prefix" name="rotate-ccw" size="14" aria-hidden="true"></ore-icon>
            Start tour
          </ore-button>
          <ore-button class="getting__btn" size="sm" variant="ghost" @click=${() => handle?.showShareHint()}>
            <ore-icon slot="prefix" name="lightbulb" size="14" aria-hidden="true"></ore-icon>
            Show share hint
          </ore-button>
          <ore-button class="getting__btn" size="sm" variant="ghost" @click=${() => handle?.resetAll()}>
            <ore-icon slot="prefix" name="eraser" size="14" aria-hidden="true"></ore-icon>
            Reset progress
          </ore-button>
        </div>
        <p class="getting__keys">
          <kbd>←</kbd> / <kbd>→</kbd> step, <kbd>Esc</kbd> close.
        </p>
        <p class="status" role="status" aria-live="polite">${() => statusText.value}</p>
      </div>
    `;

    return html`
      <div class="frame">
        <ore-sidebar class="side" label="Signalbox navigation" bottom-nav-at="(max-width: 720px)">
          <div slot="header" class="brand">
            <span class="brand__mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round">
                <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"></circle>
                <path d="M8.5 15.5a5 5 0 0 1 0-7"></path>
                <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                <path d="M6 18a9 9 0 0 1 0-12" opacity="0.55"></path>
                <path d="M18 6a9 9 0 0 1 0 12" opacity="0.55"></path>
              </svg>
            </span>
            <span class="brand__text">
              Signalbox
              <span class="brand__scope">signalbox-labs / production</span>
            </span>
          </div>
          <ore-sidebar-group id="nav-group" label="Workspace">${views.map(navItem)}</ore-sidebar-group>
          ${tourWidget()}
        </ore-sidebar>

        <div class="frame__main">
          <ore-navbar
            class="topbar"
            breakpoint="(max-width: 720px)"
            elevation="0"
            label="Signalbox workspace"
            mobile-sidebar=".side">
            <span slot="logo" class="brand brand--bar">
              <span class="brand__mark" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round">
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"></circle>
                  <path d="M8.5 15.5a5 5 0 0 1 0-7"></path>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                  <path d="M6 18a9 9 0 0 1 0-12" opacity="0.55"></path>
                  <path d="M18 6a9 9 0 0 1 0 12" opacity="0.55"></path>
                </svg>
              </span>
              Signalbox
            </span>
            <div slot="start" class="crumbs">
              <span class="crumbs__product">Signalbox</span>
              <span class="crumbs__sep" aria-hidden="true">/</span>
              <span class="crumbs__view">${() => activeLabel.value}</span>
              <ore-badge class="live" color="success" size="sm" variant="flat">
                <span class="live__dot" slot="icon" aria-hidden="true"></span>
                Live
              </ore-badge>
            </div>
            <div slot="persistent" class="topbar__actions">
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
                <ore-icon
                  name=${() => (theme.value === 'dark' ? 'sun' : 'moon')}
                  size="16"
                  aria-hidden="true"></ore-icon>
              </ore-button>
              <ore-menu class="account" placement="bottom-end" @select=${onAccountSelect}>
                <button
                  class="account__trigger"
                  slot="trigger"
                  type="button"
                  aria-label="Workspace menu: tour controls">
                  <ore-avatar color="primary" initials="SB" rounded="full" size="sm"></ore-avatar>
                </button>
                <ore-menu-item value="replay-tour">
                  <ore-icon slot="icon" name="rotate-ccw" size="15" aria-hidden="true"></ore-icon>
                  Replay tour
                </ore-menu-item>
                <ore-menu-item value="share-hint">
                  <ore-icon slot="icon" name="lightbulb" size="15" aria-hidden="true"></ore-icon>
                  Show share hint
                </ore-menu-item>
                <ore-menu-separator></ore-menu-separator>
                <ore-menu-item value="reset">
                  <ore-icon slot="icon" name="eraser" size="15" aria-hidden="true"></ore-icon>
                  Reset tour progress
                </ore-menu-item>
              </ore-menu>
            </div>
          </ore-navbar>

          <main class="sheet">
            <h1 class="sheet__title">${() => viewTitle[activeView.value]}</h1>
            ${() =>
              activeView.value === 'boards'
                ? boardsView()
                : activeView.value === 'events'
                  ? eventsView()
                  : reportsView()}
          </main>
        </div>

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
