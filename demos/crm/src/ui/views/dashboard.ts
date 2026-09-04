import '../components/activity-item';
import '../components/activity-signal';
import '../components/stage-badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/stats';
import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import type { ChartHandle } from '@vielzeug/prism';
import { createBarChart, createLineChart } from '@vielzeug/prism';
import { computed, effect } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { formatAmount, formatDate } from '../../core/format';
import { t } from '../../core/i18n';
import { router } from '../../core/router';
import {
  activityBuckets,
  conversion,
  leadsNeedingAttention,
  openPipeline,
  opportunitiesNeedingAttention,
  sourcePerformance,
  stageTotals,
  weightedPipeline,
  wonValue,
} from '../../core/selectors';
import { crmData, currentUser, locale } from '../../core/store';
import { openRecordDrawer } from '../components/record-drawer';

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? t('dashboard.goodMorning') : hour < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
}

define('crm-dashboard', {
  setup() {
    const forecastChart = ref<HTMLElement>();
    const stageChart = ref<HTMLElement>();
    let forecastHandle: ChartHandle | null = null;
    let stageHandle: ChartHandle | null = null;
    const openValue = computed(() => openPipeline(crmData.value));
    const weightedValue = computed(() => weightedPipeline(crmData.value));
    const won = computed(() => wonValue(crmData.value));
    const conversionRate = computed(() => conversion(crmData.value));
    const attentionDeals = computed(() =>
      opportunitiesNeedingAttention(crmData.value, '2026-08-31T12:00:00Z', 45).slice(0, 5),
    );
    const attentionLeads = computed(() => leadsNeedingAttention(crmData.value, '2026-08-31T12:00:00Z').length);
    const forecastConfidence = computed(() => (openValue.value ? (weightedValue.value / openValue.value) * 100 : 0));
    const buckets = computed(() => activityBuckets(crmData.value, '2026-08-31T12:00:00Z'));

    onMounted(() => {
      const stop = effect(() => {
        const data = crmData.value;
        const months = Array.from({ length: 6 }, (_, index) => new Date(2026, 8 + index, 1));
        const forecast = months.map((month) => ({
          key: month,
          value: data.opportunities
            .filter((item) => {
              const date = new Date(item.expectedClose);
              return date.getUTCFullYear() === month.getUTCFullYear() && date.getUTCMonth() === month.getUTCMonth();
            })
            .reduce((sum, item) => sum + Number(item.amount) * (item.probability / 100), 0),
        }));
        forecastHandle?.dispose();
        stageHandle?.dispose();
        forecastHandle = createLineChart(forecastChart.value!, {
          a11y: { ariaLabel: t('dashboard.probabilityAdjustedByMonth') },
          series: [
            {
              color: 'var(--signal-cobalt)',
              data: forecast,
              name: t('pipeline.weightedForecast'),
              showPoints: true,
            },
          ],
          tooltip: true,
          xAxis: {
            grid: false,
            tickFormat: (value) =>
              new Intl.DateTimeFormat(locale.value === 'de' ? 'de-DE' : 'en-GB', { month: 'short' }).format(
                value as Date,
              ),
          },
          yAxis: { grid: true },
        });
        stageHandle = createBarChart(stageChart.value!, {
          a11y: { ariaLabel: t('dashboard.openValueAcrossStages') },
          series: [
            {
              color: 'var(--signal-violet)',
              data: stageTotals(data)
                .filter((item) => !item.stage.startsWith('closed'))
                .map((item) => ({ key: item.stage, value: item.value })),
              name: t('dashboard.openPipeline'),
            },
          ],
          tooltip: true,
          xAxis: { grid: false },
          yAxis: { grid: true },
        });
      });
      onCleanup(() => {
        stop.dispose();
        forecastHandle?.dispose();
        stageHandle?.dispose();
      });
    });

    return html`
      <header class="dashboard-header">
        <div>
          <h1>${() => `${greeting()}, ${currentUser.value.name.split(' ')[0]}`}</h1>
          <p>
            ${() => `${new Intl.DateTimeFormat(locale.value === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'full' }).format(new Date())} · ${t('dashboard.yourLiveSalesSignal')}`}
          </p>
        </div>
        <div class="page-actions">
          <ore-button variant="outline" @click=${() => void router.navigate({ name: 'activity' })}>
            <ore-icon slot="prefix" name="radio" size="16"></ore-icon>
            ${() => t('action.viewActivity')}
          </ore-button>
          ${when(
            () => can('create'),
            () => html`
              <ore-button
                color="primary"
                @click=${() => document.dispatchEvent(new CustomEvent('crm:create-opportunity'))}>
                <ore-icon slot="prefix" name="plus" size="16"></ore-icon>
                ${() => t('action.newOpportunity')}
              </ore-button>
            `,
          )}
        </div>
      </header>
      <section class="signal-kpis" aria-label=${() => t('dashboard.salesMetrics')}>
        <ore-stats
          size="sm"
          variant="outlined"
          color="success"
          label=${() => t('dashboard.wonRevenue')}
          value=${() => formatAmount(String(won.value))}
          description=${() => t('dashboard.closedDeals')}>
          <ore-icon slot="icon" aria-hidden="true" name="badge-euro" size="17"></ore-icon>
        </ore-stats>
        <ore-stats
          size="sm"
          variant="outlined"
          color="primary"
          label=${() => t('dashboard.openPipeline')}
          value=${() => formatAmount(String(openValue.value))}
          description=${() => t('dashboard.activeOpportunities')}>
          <ore-icon slot="icon" aria-hidden="true" name="circle-dollar-sign" size="17"></ore-icon>
        </ore-stats>
        <ore-stats
          size="sm"
          variant="outlined"
          color="secondary"
          label=${() => t('dashboard.forecastConfidence')}
          value=${() => `${forecastConfidence.value.toFixed(0)}%`}
          description=${() => t('dashboard.weighted', { amount: formatAmount(String(weightedValue.value)) })}>
          <ore-icon slot="icon" aria-hidden="true" name="scan-line" size="17"></ore-icon>
        </ore-stats>
        <ore-stats
          size="sm"
          variant="outlined"
          color="warning"
          label=${() => t('dashboard.leadsRequiringAction')}
          value=${() => String(attentionLeads.value)}
          description=${() => t('dashboard.conversion', { rate: conversionRate.value.toFixed(1) })}>
          <ore-icon slot="icon" aria-hidden="true" name="user-round-search" size="17"></ore-icon>
        </ore-stats>
      </section>
      <div class="dashboard-primary">
        <section class="module module--forecast">
          <header>
            <div>
              <h2>${() => t('dashboard.revenueForecast')}</h2>
              <p>${() => t('dashboard.probabilityAdjustedByMonth')}</p>
            </div>
            <strong>${() => formatAmount(String(weightedValue.value))}</strong>
          </header>
          <div class="signal-chart" ref=${forecastChart}></div>
        </section>
        <aside class="module attention-queue">
          <header>
            <div>
              <h2>${() => t('dashboard.needsAttention')}</h2>
              <p>${() => t('dashboard.dealsCloseToExpectedClose')}</p>
            </div>
            <span>${() => attentionDeals.value.length}</span>
          </header>
          <ore-list class="attention-list">
            ${each(
              attentionDeals,
              (item) => item.id,
              (item) => html`
                <ore-list-item
                  actionable
                  value=${() => item.value.id}
                  @activate=${() => openRecordDrawer('opportunity', item.value.id)}>
                  <strong class="attention-item__title">${() => item.value.name}</strong>
                  <span class="attention-item__description" slot="description">
                    <small>
                      ${() => crmData.value.companies.find((company) => company.id === item.value.companyId)?.name}
                    </small>
                    <b>${() => formatAmount(item.value.amount)}</b>
                  </span>
                  <span class="attention-item__trailing" slot="trailing">
                    <stage-badge stage=${() => item.value.stage}></stage-badge>
                    <time>${() => formatDate(item.value.expectedClose, 'short')}</time>
                  </span>
                </ore-list-item>
              `,
            )}
          </ore-list>
        </aside>
      </div>
      <div class="dashboard-secondary">
        <section class="module dashboard-pipeline-distribution">
          <header>
            <div>
              <h2>${() => t('dashboard.pipelineDistribution')}</h2>
              <p>${() => t('dashboard.openValueAcrossStages')}</p>
            </div>
          </header>
          <div class="signal-chart signal-chart--compact" ref=${stageChart}></div>
        </section>
        <ore-grid class="dashboard-secondary-stack" cols="1" rows="2" gap="md">
          <section class="module activity-module">
            <header>
              <div>
                <h2>${() => t('dashboard.activitySignal')}</h2>
                <p>${() => t('dashboard.teamEngagement')}</p>
              </div>
              <button type="button" @click=${() => void router.navigate({ name: 'activity' })}>
                ${() => t('action.exploreActivity')}
                <ore-icon name="arrow-right" size="14"></ore-icon>
              </button>
            </header>
            <activity-signal compact activities=${() => crmData.value.activities} buckets=${buckets}></activity-signal>
          </section>
          <section class="module source-performance">
            <header>
              <div>
                <h2>${() => t('dashboard.leadSourcePerformance')}</h2>
                <p>${() => t('dashboard.qualifiedShareBySource')}</p>
              </div>
            </header>
            <div>
              ${() =>
                sourcePerformance(crmData.value).map(
                  (item) => html`
                    <article>
                      <span>${item.source}</span>
                      <ore-progress
                        color="success"
                        size="sm"
                        value=${item.conversion}
                        label=${t('dashboard.conversion', { rate: item.conversion.toFixed(0) })}></ore-progress>
                      <small>${item.qualified}/${item.total} ${t('dashboard.qualified')}</small>
                    </article>
                  `,
                )}
            </div>
          </section>
        </ore-grid>
      </div>
    `;
  },
  shadow: false,
});

export function createDashboardView(): HTMLElement {
  return document.createElement('crm-dashboard');
}
