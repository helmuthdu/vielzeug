import type { BarChartConfig, ChartHandle, LineChartConfig } from '@vielzeug/prism';

import { define, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import { createBarChart, createLineChart } from '@vielzeug/prism';
import { effect } from '@vielzeug/ripple';

import type { TaskStatus } from '../../core/types';

import { boardSignal } from '../../core/board-store';
import { t } from '../../core/i18n';

// ── Constants ────────────────────────────────────────────────────────────────

const COLUMN_LABEL_KEYS: Record<TaskStatus, string> = {
  done: 'task.done',
  'in-progress': 'task.inProgress',
  review: 'task.review',
  todo: 'task.todo',
};

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a fake 7-day velocity series based on dueDate.
 * Days are today-6 through today; the value is the count of "done" tasks
 * whose dueDate falls on that calendar day.
 */
function buildVelocitySeries(): { key: Date; value: number }[] {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);

    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const doneTasks = boardSignal.value.tasks.filter((t) => t.status === 'done' && t.dueDate !== null);

  return days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    const count = doneTasks.filter((t) => t.dueDate?.slice(0, 10) === dayStr).length;

    return { key: day, value: count };
  });
}

// ── createAnalyticsView ───────────────────────────────────────────────────────

define('analytics-view', {
  setup() {
    const barContainerRef = ref<HTMLElement>();
    const lineContainerRef = ref<HTMLElement>();

    let barHandle: ChartHandle | null = null;
    let lineHandle: ChartHandle | null = null;

    onMounted(() => {
      const barContainer = barContainerRef.value!;
      const lineContainer = lineContainerRef.value!;

      const stop = effect(() => {
        const tasks = boardSignal.value.tasks;

        // Tasks per column data
        const barData = STATUSES.map((status) => ({
          key: t(COLUMN_LABEL_KEYS[status]),
          value: tasks.filter((t) => t.status === status).length,
        }));

        const barConfig: BarChartConfig = {
          ariaLabel: t('analytics.tasksPerColumn'),
          series: [
            {
              color: 'var(--color-primary)',
              data: barData,
              name: t('analytics.tasks'),
            },
          ],
          tooltip: true,
          xAxis: { grid: false },
          yAxis: { grid: true },
        };

        if (barHandle) {
          barHandle.dispose();
        }

        barHandle = createBarChart(barContainer, barConfig);

        // Velocity series data
        const velocityData = buildVelocitySeries();

        const lineConfig: LineChartConfig = {
          ariaLabel: t('analytics.completionVelocity'),
          series: [
            {
              color: 'var(--color-success)',
              data: velocityData,
              name: t('analytics.completed'),
              showPoints: true,
            },
          ],
          tooltip: true,
          xAxis: {
            grid: false,
            tickFormat: (v) => {
              const d = v instanceof Date ? v : new Date(v as number);

              return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            },
          },
          yAxis: { grid: true },
        };

        if (lineHandle) {
          lineHandle.dispose();
        }

        lineHandle = createLineChart(lineContainer, lineConfig);
      });

      onCleanup(() => {
        stop.dispose();
        barHandle?.dispose();
        lineHandle?.dispose();
      });
    });

    return html`
      <h1 class="analytics__title">${() => t('analytics.title')}</h1>
      <div class="analytics__grid">
        <section class="analytics__section">
          <h2 class="analytics__section-title">${() => t('analytics.tasksPerColumn')}</h2>
          <div class="analytics__chart" ref=${barContainerRef}></div>
        </section>
        <section class="analytics__section">
          <h2 class="analytics__section-title">${() => t('analytics.completionVelocity')}</h2>
          <div class="analytics__chart" ref=${lineContainerRef}></div>
        </section>
      </div>
    `;
  },
  shadow: false,
});

export function createAnalyticsView(): HTMLElement {
  const el = document.createElement('analytics-view');

  el.className = 'analytics';

  return el;
}
