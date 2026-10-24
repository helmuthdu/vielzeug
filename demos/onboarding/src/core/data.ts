/**
 * The demo's sample dataset, written before the markup so every figure on the
 * screen renders from one source. Totals and deltas are computed from these
 * rows, never typed in separately; the assertions at the bottom keep the
 * chart series and the headline figures honest (the last point of every
 * series IS the tile figure above it).
 */

export type MetricId = 'sessions' | 'conversion' | 'latency' | 'errors' | 'revenue' | 'queue';

export interface BoardMetric {
  format: (value: number) => string;
  id: MetricId;
  name: string;
  /** Hourly points, 09:00-22:00; the last point is the live tile figure. */
  series: number[];
  value: number;
}

export interface StreamEvent {
  detail: string;
  icon: string;
  id: number;
  time: string;
}

export interface ReportRow {
  cadence: string;
  delivered: string;
  id: string;
  lastRun: string;
  name: string;
  nextRun: string;
  owner: string;
}

const nf = (options: Intl.NumberFormatOptions): Intl.NumberFormat => new Intl.NumberFormat('en', options);

export const fmt = {
  dec:
    (digits: number) =>
    (value: number): string =>
      nf({ maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value),
  eur: (value: number): string =>
    nf({ currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'currency' }).format(value),
  int: (value: number): string => nf({ maximumFractionDigits: 0 }).format(value),
  ms: (value: number): string => `${nf({ maximumFractionDigits: 0 }).format(value)} ms`,
  pct:
    (digits: number) =>
    (value: number): string =>
      nf({ maximumFractionDigits: digits, minimumFractionDigits: digits, style: 'percent' }).format(value),
};

/** Hourly axis labels, 09:00 through 22:00 — fourteen points, one step all the way. */
export const hourLabels = Array.from({ length: 14 }, (_, hour) => `${String(hour + 9).padStart(2, '0')}:00`);

export const boardMetrics: BoardMetric[] = [
  {
    format: fmt.int,
    id: 'sessions',
    name: 'Sessions today',
    series: [9820, 10410, 11250, 11980, 12640, 13350, 14120, 14880, 15530, 16240, 16980, 17450, 17980, 18402],
    value: 18402,
  },
  {
    format: fmt.pct(1),
    id: 'conversion',
    name: 'Conversion',
    series: [0.029, 0.03, 0.031, 0.03, 0.032, 0.033, 0.034, 0.035, 0.036, 0.036, 0.037, 0.037, 0.038, 0.038],
    value: 0.038,
  },
  {
    format: fmt.ms,
    id: 'latency',
    name: 'p95 latency',
    series: [188, 192, 186, 198, 205, 190, 184, 196, 240, 318, 262, 224, 212, 212],
    value: 212,
  },
  {
    format: fmt.pct(2),
    id: 'errors',
    name: 'Error rate',
    series: [
      0.0031, 0.0028, 0.0033, 0.003, 0.0035, 0.0041, 0.0062, 0.0088, 0.0071, 0.0052, 0.0047, 0.0044, 0.0042, 0.0042,
    ],
    value: 0.0042,
  },
  {
    format: fmt.eur,
    id: 'revenue',
    name: 'Revenue (24h)',
    series: [21400, 23100, 24800, 26200, 27900, 29600, 31200, 32800, 34500, 36100, 37800, 39200, 40400, 41208],
    value: 41208,
  },
  {
    format: fmt.int,
    id: 'queue',
    name: 'Queue depth',
    series: [3, 5, 4, 6, 5, 7, 9, 12, 8, 6, 7, 6, 7, 7],
    value: 7,
  },
];

/** The event feed's rotating seed lines; the shell stamps ids and times on them. */
export const eventSeed: Omit<StreamEvent, 'id' | 'time'>[] = [
  { detail: 'checkout-e2e flagged 3 slow responses', icon: 'alert-triangle' },
  { detail: 'Board "Product analytics" shared with 4 teammates', icon: 'share-2' },
  { detail: 'Deploy 4f2c1a promoted to production', icon: 'rocket' },
  { detail: 'Conversion crossed its 7-day high', icon: 'trending-up' },
  { detail: 'Queue depth back under its alert line', icon: 'check-circle' },
  { detail: 'Nightly report delivered to #analytics', icon: 'mail' },
];

export const reportRows: ReportRow[] = [
  {
    cadence: 'Daily · 07:00',
    delivered: '#analytics',
    id: 'funnel',
    lastRun: 'Today 07:00',
    name: 'Signup funnel',
    nextRun: 'Tomorrow 07:00',
    owner: 'Maya',
  },
  {
    cadence: 'Weekly · Mon',
    delivered: 'Tomas',
    id: 'latency',
    lastRun: 'Mon 19 Oct',
    name: 'Latency budget',
    nextRun: 'Mon 26 Oct',
    owner: 'Tomas',
  },
  {
    cadence: 'Weekly · Mon',
    delivered: '#finance',
    id: 'revenue',
    lastRun: 'Mon 19 Oct',
    name: 'Revenue by plan',
    nextRun: 'Mon 26 Oct',
    owner: 'Ines',
  },
  {
    cadence: 'Monthly',
    delivered: 'Ada',
    id: 'churn',
    lastRun: '1 Oct 08:00',
    name: 'Churn post-mortem',
    nextRun: '1 Nov 08:00',
    owner: 'Ada',
  },
];

// The screen's figures must agree with their own charts: the live tile value
// is always the newest point of the series it charts.
for (const metric of boardMetrics) {
  console.assert(metric.series.length === hourLabels.length, `${metric.id}: series/label length`);
  console.assert(
    metric.series[metric.series.length - 1] === metric.value,
    `${metric.id}: last point must equal the tile figure`,
  );
}
