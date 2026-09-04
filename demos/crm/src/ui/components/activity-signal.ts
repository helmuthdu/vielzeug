import { type AnimationGroup, animateEach } from '@vielzeug/necromancer';
import { define, each, html, onCleanup, onMounted, prop, ref } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { now, Temporal } from '@vielzeug/tempo';
import { t } from '../../core/i18n';
import { locale } from '../../core/store';
import type { Activity } from '../../core/types';

const BUCKET_COUNT = 84;
const ROW_COUNT = 7;

export interface ActivityDensityBucket {
  count: number;
  date: string;
}

export type ActivitySignalProps = {
  activities: readonly Activity[];
  buckets?: readonly ActivityDensityBucket[];
  compact?: boolean;
  companyId?: string;
};

interface DensityCell extends ActivityDensityBucket {
  label: string;
  level: number;
}

interface DensityRow {
  cells: DensityCell[];
  id: number;
}

function parseDate(value: string): Temporal.PlainDate | null {
  try {
    return Temporal.PlainDate.from(value);
  } catch {
    return null;
  }
}

function activityDate(activity: Activity): Temporal.PlainDate | null {
  try {
    return Temporal.Instant.from(activity.createdAt).toZonedDateTimeISO('UTC').toPlainDate();
  } catch {
    return null;
  }
}

function latestDate(dates: readonly Temporal.PlainDate[]): Temporal.PlainDate | null {
  return dates.reduce<Temporal.PlainDate | null>(
    (latest, date) => (!latest || Temporal.PlainDate.compare(date, latest) > 0 ? date : latest),
    null,
  );
}

function formatCellLabel(date: string, count: number): string {
  const formattedDate = new Intl.DateTimeFormat(locale.value === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
  return `${formattedDate}: ${count} ${t(count === 1 ? 'activitySignal.activity' : 'activitySignal.activities')}`;
}

function densityCells(
  activities: readonly Activity[],
  suppliedBuckets: readonly ActivityDensityBucket[] | undefined,
  companyId: string,
): DensityCell[] {
  const suppliedDates = (suppliedBuckets ?? []).flatMap((bucket) => {
    const date = parseDate(bucket.date);
    return date ? [date] : [];
  });
  const activityDates = activities.flatMap((activity) => {
    const date = activityDate(activity);
    return date ? [date] : [];
  });
  const end = latestDate(suppliedDates) ?? latestDate(activityDates) ?? now({ timeZone: 'UTC' }).toPlainDate();
  const counts = new Map<string, number>();

  if (suppliedBuckets !== undefined) {
    for (const bucket of suppliedBuckets) {
      const date = parseDate(bucket.date);
      if (!date) continue;
      const count = Number.isFinite(bucket.count) ? Math.max(0, Math.floor(bucket.count)) : 0;
      counts.set(date.toString(), (counts.get(date.toString()) ?? 0) + count);
    }
  } else {
    for (const activity of activities) {
      if (companyId && activity.companyId !== companyId) continue;
      const date = activityDate(activity);
      if (!date) continue;
      counts.set(date.toString(), (counts.get(date.toString()) ?? 0) + 1);
    }
  }

  const buckets = Array.from({ length: BUCKET_COUNT }, (_, index) => {
    const date = end.subtract({ days: BUCKET_COUNT - index - 1 }).toString();
    return { count: counts.get(date) ?? 0, date };
  });
  const maximum = Math.max(0, ...buckets.map((bucket) => bucket.count));

  return buckets.map((bucket) => ({
    ...bucket,
    label: formatCellLabel(bucket.date, bucket.count),
    level: bucket.count === 0 || maximum === 0 ? 0 : Math.max(1, Math.ceil((bucket.count / maximum) * 4)),
  }));
}

define<ActivitySignalProps>('activity-signal', {
  props: {
    activities: prop.data<readonly Activity[]>([]),
    buckets: prop.data<readonly ActivityDensityBucket[]>(),
    compact: prop.bool(false),
    companyId: prop.string(''),
  },
  setup(props) {
    const grid = ref<HTMLElement>();
    const cells = computed(() =>
      densityCells(props.activities.value, props.buckets.value, props.companyId.value ?? ''),
    );
    const rows = computed<DensityRow[]>(() =>
      Array.from({ length: ROW_COUNT }, (_, id) => ({
        cells: cells.value.filter((_, index) => index % ROW_COUNT === id),
        id,
      })),
    );
    const total = computed(() => cells.value.reduce((sum, cell) => sum + cell.count, 0));
    let animation: AnimationGroup | null = null;

    onMounted(() => {
      if (typeof Element.prototype.animate !== 'function') return;
      const group = animateEach(
        grid.value?.querySelectorAll<HTMLElement>('.activity-signal__cell') ?? [],
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 180, easing: 'ease-out', motion: 'system', stagger: 3 },
      );
      animation = group;
      void group.results.finally(() => {
        group.dispose();
        if (animation === group) animation = null;
      });
    });
    onCleanup(() => animation?.dispose());

    return html`
      <section
        class=${() => `activity-signal__surface${props.compact.value ? ' activity-signal__surface--compact' : ''}`}>
        <span class="activity-signal__summary">
          ${() => t('activitySignal.activitiesAcrossLast84Days', { count: total.value })}
        </span>
        <div
          class="activity-signal__grid"
          ref=${grid}
          role="grid"
          aria-label=${() => t('activitySignal.dailyActivityDensity')}
          aria-rowcount="7"
          aria-colcount="12">
          ${each(
            rows,
            (row) => row.id,
            (row) => html`
              <div class="activity-signal__row" role="row">
                ${each(
                  () => row.value.cells,
                  (cell) => cell.date,
                  (cell) => html`
                    <span
                      class=${() => `activity-signal__cell activity-signal__cell--level-${cell.value.level}`}
                      role="gridcell"
                      aria-label=${() => cell.value.label}
                      data-date=${() => cell.value.date}
                      data-count=${() => String(cell.value.count)}></span>
                  `,
                )}
              </div>
            `,
          )}
        </div>
        <div class="activity-signal__legend" aria-label=${() => t('activitySignal.dailyActivityDensity')}>
          <span class="activity-signal__legend-label">${() => t('activitySignal.less')}</span>
          ${[0, 1, 2, 3, 4].map(
            (level) => html`
              <span
                class=${`activity-signal__legend-cell activity-signal__legend-cell--level-${level}`}
                aria-hidden="true"></span>
            `,
          )}
          <span class="activity-signal__legend-label">${() => t('activitySignal.more')}</span>
        </div>
      </section>
    `;
  },
  shadow: false,
});
