import '../components/company-mark';
import '../components/owner-chip';
import '../components/stage-badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import { createSortable, createSortableScope } from '@vielzeug/dnd/sortable';
import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import { createSparkline } from '@vielzeug/prism';
import { computed, effect, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { formatAmount, formatDate, formatRelativeDate } from '../../core/format';
import { moveOpportunity } from '../../core/history';
import { t } from '../../core/i18n';
import {
  activityBuckets,
  openPipeline,
  opportunitiesNeedingAttention,
  stageTotals,
  weightedPipeline,
} from '../../core/selectors';
import { crmData, opportunitiesByStage } from '../../core/store';
import type { Opportunity, OpportunityStage } from '../../core/types';
import { openRecordDrawer } from '../components/record-drawer';

const stages: Array<{ id: OpportunityStage; label: () => string }> = [
  { id: 'prospecting', label: () => t('pipeline.prospecting') },
  { id: 'qualification', label: () => t('pipeline.qualification') },
  { id: 'proposal', label: () => t('pipeline.proposal') },
  { id: 'negotiation', label: () => t('pipeline.negotiation') },
  { id: 'closed-won', label: () => t('pipeline.closedWon') },
  { id: 'closed-lost', label: () => t('pipeline.closedLost') },
];
function pipelineCard(opportunity: () => Opportunity) {
  const company = () => crmData.value.companies.find((item) => item.id === opportunity().companyId);

  return html`
    <article
      class="pipeline-card"
      data-opportunity-id=${() => opportunity().id}
      data-risk=${() =>
        new Date(opportunity().expectedClose).getTime() < Date.parse('2026-09-30T00:00:00Z') ? 'soon' : 'normal'}>
      <button
        class="pipeline-card__button"
        type="button"
        aria-label=${() => t('pipeline.openOpportunity', { name: opportunity().name })}
        @click=${() => openRecordDrawer('opportunity', opportunity().id)}>
        <company-mark name=${() => company()?.name ?? t('common.unknown')}></company-mark>
        <span class="pipeline-card__identity">
          <span class="pipeline-card__company">${() => company()?.name ?? ''}</span>
          <strong>${() => opportunity().name}</strong>
        </span>
        <ore-icon class="pipeline-card__grip" name="grip-vertical" size="15"></ore-icon>
        <span class="pipeline-card__value">
          ${() => formatAmount(opportunity().amount)}
          <small>${() => `${opportunity().probability}%`}</small>
        </span>
        <span class="pipeline-card__meta">
          <owner-chip owner-id=${() => opportunity().ownerId}></owner-chip>
          <time datetime=${() => opportunity().expectedClose}>
            ${() => formatDate(opportunity().expectedClose, 'short')}
          </time>
        </span>
      </button>
    </article>
  `;
}

define('crm-pipeline-view', {
  setup() {
    const board = ref<HTMLElement>();
    const stageChangeChart = ref<HTMLElement>();
    const view = signal<'board' | 'changes' | 'forecast'>('board');
    const openValue = computed(() => openPipeline(crmData.value));
    const weightedValue = computed(() => weightedPipeline(crmData.value));
    const maxStageValue = computed(() => Math.max(...stageTotals(crmData.value).map((item) => item.value), 1));
    const riskCount = computed(() => opportunitiesNeedingAttention(crmData.value, '2026-08-31T12:00:00Z', 45).length);
    const stageChanges = computed(() =>
      crmData.value.activities.filter((item) => item.kind === 'opportunity.stageChanged'),
    );
    const stageChangeTrend = computed(() => {
      const daily = activityBuckets({ ...crmData.value, activities: stageChanges.value }, '2026-08-31T12:00:00Z');
      return Array.from({ length: 12 }, (_, week) =>
        daily.slice(week * 7, week * 7 + 7).reduce((total, bucket) => total + bucket.count, 0),
      );
    });
    const stageChangeCount = computed(() => stageChangeTrend.value.reduce((total, count) => total + count, 0));
    const recentChanges = computed(() => stageChanges.value.slice(0, 12));
    onMounted(() => {
      const handlers = new Map<HTMLElement, (ids: readonly string[]) => void>();
      const scope = createSortableScope({
        onMove: ({ target, targetIds }) => handlers.get(target)?.(targetIds),
        touch: true,
      });
      const stageChangeHandle = createSparkline(stageChangeChart.value!, {
        a11y: { decorative: true },
        color: 'var(--signal-teal)',
        curve: 'monotone',
        data: stageChangeTrend.value,
        strokeWidth: 2,
        variant: 'area',
      });
      const stopChartUpdates = stageChangeTrend.subscribe(() => stageChangeHandle.update(stageChangeTrend.value));
      const handles: Array<{ dispose(): void; refresh(): void }> = [];
      const currentIds = new Map<OpportunityStage, Set<string>>();
      const columns = new Map<OpportunityStage, HTMLElement>();
      for (const stage of stages) {
        const container = board.value!.querySelector<HTMLElement>(
          `[data-stage="${stage.id}"] .pipeline-column__cards`,
        )!;
        columns.set(stage.id, container);
        currentIds.set(stage.id, new Set());
        handlers.set(container, (ids) => {
          const movedId = ids.find((id) => !currentIds.get(stage.id)!.has(id));
          if (movedId && can('update')) void moveOpportunity(movedId, stage.id);
        });
        handles.push(
          createSortable({
            disabled: !can('update'),
            element: container,
            getKey: (child) => child.dataset.opportunityId ?? '',
            onReorder: () => undefined,
            scope,
          }),
        );
      }
      const stop = effect(() => {
        void crmData.value;
        if (scope.isDragging) return;
        for (const stage of stages)
          currentIds.set(stage.id, new Set(opportunitiesByStage(stage.id).map((item) => item.id)));
        queueMicrotask(() => {
          for (const handle of handles) handle.refresh();
        });
      });
      const reconcile = (): void => {
        crmData.value = { ...crmData.value };
      };
      document.addEventListener('dragend', reconcile);
      onCleanup(() => {
        document.removeEventListener('dragend', reconcile);
        stageChangeHandle.dispose();
        stopChartUpdates();
        stop.dispose();
        scope.dispose();
      });
    });
    return html`
      <header class="pipeline-header">
        <div>
          <h1>${() => t('nav.pipeline')}</h1>
          <p>${() => t('pipeline.moveDealsForward')}</p>
        </div>
        <div class="page-actions">
          <ore-button variant="outline" @click=${() => document.dispatchEvent(new CustomEvent('crm:undo'))}>
            <ore-icon slot="prefix" name="undo-2" size="16"></ore-icon>
            ${() => t('action.undo')}
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
      <section class="pipeline-summary">
        <ore-stats
          variant="plain"
          label=${() => t('dashboard.openPipeline')}
          value=${() => formatAmount(String(openValue.value))}
          description=${() => t('dashboard.activeOpportunities')}></ore-stats>
        <ore-stats
          variant="plain"
          label=${() => t('pipeline.weightedForecast')}
          value=${() => formatAmount(String(weightedValue.value))}
          description=${() => t('companyDetail.probabilityAdjusted')}></ore-stats>
        <ore-stats
          variant="plain"
          label=${() => t('pipeline.closingSoon')}
          value=${() => String(riskCount.value)}
          description=${() => t('dashboard.dealsCloseToExpectedClose')}></ore-stats>
        <ore-stats
          class="pipeline-stage-changes"
          variant="plain"
          label=${() => t('pipeline.stageChanges')}
          value=${() => String(stageChangeCount.value)}
          description=${() => t('pipeline.last12Weeks')}>
          <span class="pipeline-stage-changes__sparkline" slot="visual" ref=${stageChangeChart}></span>
        </ore-stats>
      </section>
      <ore-tabs
        class="workspace-tabs pipeline-tabs"
        density="compact"
        variant="ghost"
        color="primary"
        label=${() => t('pipeline.pipelineViews')}
        value=${view}
        @change=${(event: CustomEvent<{ value: 'board' | 'changes' | 'forecast' }>) => {
          view.value = event.detail.value;
        }}>
        <ore-tab-item slot="tabs" value="board">${() => t('pipeline.board')}</ore-tab-item>
        <ore-tab-item slot="tabs" value="forecast">${() => t('pipeline.forecast')}</ore-tab-item>
        <ore-tab-item slot="tabs" value="changes">${() => t('pipeline.changes')}</ore-tab-item>
      </ore-tabs>
      <div class="pipeline-view" ?hidden=${() => view.value !== 'board'}>
        <p class="pipeline-board-hint">${() => t('pipeline.boardHint')}</p>
        <div class="pipeline-board" ref=${board}>
          ${stages.map(
            (stage) => html`
              <section class="pipeline-column" data-stage=${stage.id}>
                <header>
                  <span class="stage-marker"></span>
                  <h2>${stage.label}</h2>
                  <span>${() => opportunitiesByStage(stage.id).length}</span>
                </header>
                <div class="pipeline-column__cards">
                  ${each(
                    () => opportunitiesByStage(stage.id),
                    (item) => item.id,
                    (item) => pipelineCard(() => item.value),
                  )}
                </div>
                <footer>
                  ${() => formatAmount(String(opportunitiesByStage(stage.id).reduce((sum, item) => sum + Number(item.amount), 0)))}
                </footer>
              </section>
            `,
          )}
        </div>
      </div>
      <ore-grid class="pipeline-forecast" cols="2" ?hidden=${() => view.value !== 'forecast'}>
        ${() =>
          stageTotals(crmData.value).map(
            (item) => html`
              <article data-stage=${item.stage}>
                <header>
                  <stage-badge stage=${item.stage}></stage-badge>
                  <strong>${formatAmount(String(item.value))}</strong>
                </header>
                <ore-progress
                  color="secondary"
                  size="sm"
                  value=${(item.value / maxStageValue.value) * 100}
                  label=${`${((item.value / maxStageValue.value) * 100).toFixed(0)}%`}></ore-progress>
                <span>${t('pipeline.opportunitiesCount', { count: item.count })}</span>
              </article>
            `,
          )}
      </ore-grid>
      <section class="pipeline-changes" ?hidden=${() => view.value !== 'changes'}>
        ${each(
          recentChanges,
          (item) => item.id,
          (item) => html`
            <article>
              <span class=${() => `activity-kind activity-kind--${item.value.category}`}>
                <ore-icon name="move-right" size="15"></ore-icon>
              </span>
              <div>
                <strong>${() => item.value.actor}</strong>
                <p>${() => item.value.description}</p>
              </div>
              <time>${() => formatRelativeDate(item.value.createdAt)}</time>
            </article>
          `,
        )}
      </section>
    `;
  },
  shadow: false,
});

export function createPipelineView(): HTMLElement {
  return document.createElement('crm-pipeline-view');
}
