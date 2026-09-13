import '../components/company-mark';
import '../components/owner-chip';
import '../components/stage-badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/radio';
import '@vielzeug/refine/radio-group';
import '@vielzeug/refine/select';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import { createSortable, createSortableScope } from '@vielzeug/dnd/sortable';
import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import { createSparkline } from '@vielzeug/prism';
import { computed, effect, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { formatAmount, formatDate, formatRelativeDate } from '../../core/format';
import { ledger, moveOpportunity } from '../../core/history';
import { t } from '../../core/i18n';
import { demoUsers } from '../../core/seed-data';
import {
  activityBuckets,
  openPipeline,
  opportunitiesNeedingAttention,
  ownerById,
  stageTotals,
  weightedPipeline,
} from '../../core/selectors';
import { crmData } from '../../core/store';
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
const completedStages = new Set<OpportunityStage>(['closed-won', 'closed-lost']);
const closingCutoff = Date.parse('2026-10-15T12:00:00Z');
const pipelineSearchParams = (): URLSearchParams => {
  const hashQuery = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
  return new URLSearchParams(location.search || hashQuery);
};
const replacePipelineSearch = (params: URLSearchParams): void => {
  const query = params.size ? `?${params}` : '';
  if (location.hash.startsWith('#/')) {
    const route = location.hash.split('?')[0];
    history.replaceState(history.state, '', `${location.pathname}${location.search}${route}${query}`);
  } else history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`);
};
const pipelineCompanies = computed(() => crmData.value.companies);
const pipelineOpportunities = computed(() => crmData.value.opportunities);
const opportunitiesForStage = (stage: OpportunityStage): Opportunity[] =>
  pipelineOpportunities.value.filter((opportunity) => opportunity.stage === stage);
function pipelineCard(opportunity: () => Opportunity, stage: () => string) {
  const company = () => pipelineCompanies.value.find((item) => item.id === opportunity().companyId);

  return html`
    <article
      class="pipeline-card"
      data-opportunity-id=${() => opportunity().id}
      data-risk=${() =>
        new Date(opportunity().expectedClose).getTime() < Date.parse('2026-09-30T00:00:00Z') ? 'soon' : 'normal'}>
      <button
        class="pipeline-card__button"
        type="button"
        aria-describedby="pipeline-board-hint"
        aria-label=${() =>
          `${opportunity().name}, ${company()?.name ?? t('common.unknown')}, ${formatAmount(opportunity().amount)}, ${opportunity().probability}%, ${stage()}, ${ownerById(opportunity().ownerId)?.name ?? t('common.unknown')}, ${formatDate(opportunity().expectedClose)}`}
        @click=${() => openRecordDrawer('opportunity', opportunity().id)}>
        <company-mark name=${() => company()?.name ?? t('common.unknown')}></company-mark>
        <span class="pipeline-card__identity">
          <span class="pipeline-card__company">${() => company()?.name ?? ''}</span>
          <strong>${() => opportunity().name}</strong>
        </span>
        <ore-icon class="pipeline-card__grip" name="grip-vertical" size="15" aria-hidden="true"></ore-icon>
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
    const initialFilters = pipelineSearchParams();
    const initialOwner = initialFilters.get('owner') ?? 'all';
    const board = ref<HTMLElement>();
    const ownerFilter = ref<HTMLElement & { options: Array<{ label: string; value: string }> }>();
    const searchInput = ref<HTMLElement>();
    const stageChangeChart = ref<HTMLElement>();
    const view = signal<'board' | 'changes' | 'forecast'>('board');
    const query = signal((initialFilters.get('q') ?? '').slice(0, 100));
    const owner = signal(
      initialOwner === 'all' || demoUsers.some((user) => user.id === initialOwner) ? initialOwner : 'all',
    );
    const sort = signal<'close-date' | 'value'>(initialFilters.get('sort') === 'value' ? 'value' : 'close-date');
    const closingOnly = signal(initialFilters.get('closing') === '1');
    const showCompleted = signal(initialFilters.get('stages') === 'all');
    const searchOpen = signal(query.value.length > 0);
    const filterOpen = signal(false);
    const sortOpen = signal(false);
    const stageVisibilityOpen = signal(false);
    const stageIndex = signal(0);
    const stageEnd = signal(1);
    const canScrollBack = signal(false);
    const canScrollForward = signal(false);
    let boardPositionTimer: ReturnType<typeof setTimeout> | undefined;
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
    const undoEntry = signal(ledger.state.value.undo.at(-1));
    const visibleStageCount = computed(() =>
      showCompleted.value ? stages.length : stages.length - completedStages.size,
    );
    const filtersActive = computed(() => query.value.length > 0 || owner.value !== 'all' || closingOnly.value);
    const filteredOpportunities = (stage: OpportunityStage): Opportunity[] => {
      const search = query.value.trim().toLocaleLowerCase();
      return opportunitiesForStage(stage)
        .filter((opportunity) => {
          const company = pipelineCompanies.value.find((item) => item.id === opportunity.companyId)?.name ?? '';
          return (
            (!search || `${opportunity.name} ${company}`.toLocaleLowerCase().includes(search)) &&
            (owner.value === 'all' || opportunity.ownerId === owner.value) &&
            (!closingOnly.value ||
              (!completedStages.has(stage) && new Date(opportunity.expectedClose).getTime() <= closingCutoff))
          );
        })
        .toSorted((left, right) =>
          sort.value === 'value'
            ? Number(right.amount) - Number(left.amount)
            : new Date(left.expectedClose).getTime() - new Date(right.expectedClose).getTime(),
        );
    };
    const visibleDeals = computed(() =>
      pipelineOpportunities.value.filter(
        (opportunity) => showCompleted.value || !completedStages.has(opportunity.stage),
      ),
    );
    const filteredDeals = computed(() =>
      stages
        .filter((stage) => showCompleted.value || !completedStages.has(stage.id))
        .reduce((total, stage) => total + filteredOpportunities(stage.id).length, 0),
    );
    const activeFilterCount = computed(() => Number(owner.value !== 'all') + Number(closingOnly.value));
    const clearFilters = (): void => {
      query.value = '';
      owner.value = 'all';
      closingOnly.value = false;
    };
    const selectValue = (event: Event): string =>
      (event as CustomEvent<{ value?: string }>).detail?.value ??
      (event.currentTarget as HTMLElement & { value: string }).value;
    const toggleSearch = (): void => {
      searchOpen.value = !searchOpen.value;
      if (searchOpen.value) requestAnimationFrame(() => searchInput.value?.focus());
    };
    const selectSort = (event: Event): void => {
      sort.value = (event.currentTarget as HTMLElement & { value: 'close-date' | 'value' }).value;
      sortOpen.value = false;
    };
    const selectStageVisibility = (event: Event): void => {
      showCompleted.value = (event.currentTarget as HTMLElement & { value: 'active' | 'all' }).value === 'all';
      stageVisibilityOpen.value = false;
    };
    const updateBoardPosition = (): void => {
      const element = board.value;
      if (!element) return;
      const firstColumn = element.querySelector<HTMLElement>('.pipeline-column:not([hidden])');
      const step = (firstColumn?.offsetWidth ?? 250) + 12;
      const visibleColumns = Math.max(1, Math.floor((element.clientWidth + 12) / step));
      stageIndex.value = Math.min(Math.round(element.scrollLeft / step), visibleStageCount.value - 1);
      stageEnd.value = Math.min(stageIndex.value + visibleColumns, visibleStageCount.value);
      canScrollBack.value = element.scrollLeft > step / 2;
      canScrollForward.value = element.scrollLeft < element.scrollWidth - element.clientWidth - step / 2;
    };
    const scheduleBoardPosition = (): void => {
      clearTimeout(boardPositionTimer);
      boardPositionTimer = setTimeout(updateBoardPosition, 80);
    };
    const scrollBoard = (direction: -1 | 1): void => {
      const element = board.value;
      const firstColumn = element?.querySelector<HTMLElement>('.pipeline-column:not([hidden])');
      if (!element || !firstColumn) return;
      element.scrollBy({ behavior: 'auto', left: direction * (firstColumn.offsetWidth + 12) });
    };
    onMounted(() => {
      const stopLedger = ledger.state.subscribe(() => {
        undoEntry.value = ledger.state.value.undo.at(-1);
      });
      const stopControls = effect(() => {
        ownerFilter.value!.options = [
          { label: t('companies.allOwners'), value: 'all' },
          ...demoUsers.map((user) => ({ label: user.name, value: user.id })),
        ];
      });
      const stopUrlSync = effect(() => {
        const params = new URLSearchParams();
        if (query.value) params.set('q', query.value);
        if (owner.value !== 'all') params.set('owner', owner.value);
        if (sort.value !== 'close-date') params.set('sort', sort.value);
        if (closingOnly.value) params.set('closing', '1');
        if (showCompleted.value) params.set('stages', 'all');
        replacePipelineSearch(params);
      });
      const stopBoardLayout = effect(() => {
        void showCompleted.value;
        queueMicrotask(updateBoardPosition);
      });
      board.value!.addEventListener('scroll', scheduleBoardPosition, { passive: true });
      window.addEventListener('resize', updateBoardPosition);
      queueMicrotask(updateBoardPosition);
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
      let pendingMove: Promise<boolean> | undefined;
      for (const stage of stages) {
        const container = board.value!.querySelector<HTMLElement>(
          `[data-stage="${stage.id}"] .pipeline-column__cards`,
        )!;
        currentIds.set(stage.id, new Set());
        handlers.set(container, (ids) => {
          const movedId = ids.find((id) => !currentIds.get(stage.id)!.has(id));
          pendingMove = movedId && can('update') ? moveOpportunity(movedId, stage.id) : undefined;
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
      const refreshSortables = (): void => {
        for (const stage of stages)
          currentIds.set(stage.id, new Set(opportunitiesForStage(stage.id).map((item) => item.id)));
        queueMicrotask(() => {
          for (const handle of handles) handle.refresh();
        });
      };
      const stop = effect(() => {
        void pipelineOpportunities.value;
        void query.value;
        void owner.value;
        void sort.value;
        void closingOnly.value;
        void showCompleted.value;
        if (!scope.isDragging) refreshSortables();
      });
      const forceReconcile = (): void => {
        crmData.value = { ...crmData.value };
        refreshSortables();
      };
      const reconcile = (): void => {
        const move = pendingMove;
        pendingMove = undefined;
        if (!move) {
          forceReconcile();
          return;
        }
        void move.then((moved) => (moved ? refreshSortables() : forceReconcile()), forceReconcile);
      };
      document.addEventListener('dragend', reconcile);
      onCleanup(() => {
        document.removeEventListener('dragend', reconcile);
        board.value?.removeEventListener('scroll', scheduleBoardPosition);
        window.removeEventListener('resize', updateBoardPosition);
        clearTimeout(boardPositionTimer);
        stageChangeHandle.dispose();
        stopChartUpdates();
        stopLedger();
        stopControls.dispose();
        stopUrlSync.dispose();
        stopBoardLayout.dispose();
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
          <ore-button
            variant="outline"
            ?disabled=${() => !undoEntry.value}
            aria-label=${() => (undoEntry.value ? `${t('action.undo')}: ${undoEntry.value.label}` : t('action.undo'))}
            title=${() => (undoEntry.value ? `${t('action.undo')}: ${undoEntry.value.label}` : t('action.undo'))}
            @click=${() => document.dispatchEvent(new CustomEvent('crm:undo'))}>
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
          label=${() => t('pipeline.closingIn45Days')}
          value=${() => String(riskCount.value)}
          description=${() => t('dashboard.dealsCloseToExpectedClose')}></ore-stats>
        <ore-stats
          variant="plain"
          label=${() => t('pipeline.weightedForecast')}
          value=${() => formatAmount(String(weightedValue.value))}
          description=${() => t('companyDetail.probabilityAdjusted')}></ore-stats>
        <ore-stats
          variant="plain"
          label=${() => t('dashboard.openPipeline')}
          value=${() => formatAmount(String(openValue.value))}
          description=${() => t('dashboard.activeOpportunities')}></ore-stats>
        <ore-stats
          class="pipeline-stage-changes"
          variant="plain"
          label=${() => t('pipeline.stageChanges')}
          value=${() => String(stageChangeCount.value)}
          description=${() => t('pipeline.last12Weeks')}>
          <span class="pipeline-stage-changes__sparkline" slot="visual" ref=${stageChangeChart}></span>
        </ore-stats>
      </section>
      <div class="pipeline-controlbar">
        <div class="pipeline-controlbar__main">
          <ore-tabs
            class="workspace-tabs pipeline-tabs"
            variant="ghost"
            color="primary"
            label=${() => t('pipeline.pipelineViews')}
            value=${view}
            @change=${(event: CustomEvent<{ value: 'board' | 'changes' | 'forecast' }>) => {
              view.value = event.detail.value;
            }}>
            <ore-tab-item slot="tabs" value="board">${() => t('pipeline.board')}</ore-tab-item>
            <ore-tab-item slot="tabs" value="forecast">${() => t('pipeline.stageValue')}</ore-tab-item>
            <ore-tab-item slot="tabs" value="changes">${() => t('pipeline.changes')}</ore-tab-item>
          </ore-tabs>
          <div class="pipeline-controlbar__actions" ?hidden=${() => view.value !== 'board'}>
            <ore-button
              icon-only
              size="sm"
              variant=${() => (searchOpen.value ? 'flat' : 'ghost')}
              color=${() => (searchOpen.value ? 'primary' : undefined)}
              label=${() => t('dataGrid.search')}
              @click=${toggleSearch}>
              <ore-icon name="search" size="16"></ore-icon>
            </ore-button>
            <ore-popover
              placement="bottom-end"
              label=${() => t('dataGrid.sort')}
              ?open=${sortOpen}
              @open-change=${(event: CustomEvent<{ open: boolean }>) => {
                sortOpen.value = event.detail.open;
              }}>
              <ore-button
                icon-only
                size="sm"
                variant=${() => (sort.value !== 'close-date' ? 'flat' : 'ghost')}
                color=${() => (sort.value !== 'close-date' ? 'primary' : undefined)}
                label=${() => t('dataGrid.sort')}>
                <ore-icon name="arrow-up-down" size="16"></ore-icon>
              </ore-button>
              <div class="pipeline-control-panel" slot="content">
                <ore-radio-group
                  name="pipeline-sort"
                  label=${() => t('dataGrid.sortBy')}
                  value=${sort}
                  @change=${selectSort}>
                  <ore-radio value="close-date">${() => t('pipeline.sortCloseDate')}</ore-radio>
                  <ore-radio value="value">${() => t('pipeline.sortHighestValue')}</ore-radio>
                </ore-radio-group>
              </div>
            </ore-popover>
            <ore-popover
              placement="bottom-end"
              label=${() => t('dataGrid.filter')}
              ?open=${filterOpen}
              @open-change=${(event: CustomEvent<{ open: boolean }>) => {
                filterOpen.value = event.detail.open;
              }}>
              <ore-button
                class="pipeline-filter-trigger"
                icon-only
                size="sm"
                variant=${() => (activeFilterCount.value ? 'flat' : 'ghost')}
                color=${() => (activeFilterCount.value ? 'primary' : undefined)}
                label=${() =>
                  activeFilterCount.value
                    ? t(activeFilterCount.value === 1 ? 'dataGrid.activeFilter' : 'dataGrid.activeFilters', {
                        count: activeFilterCount.value,
                      })
                    : t('dataGrid.filter')}>
                <ore-icon name="list-filter" size="16"></ore-icon>
                ${when(
                  () => activeFilterCount.value > 0,
                  () => html`
                    <span class="pipeline-filter-count">${() => activeFilterCount.value}</span>
                  `,
                )}
              </ore-button>
              <div class="pipeline-control-panel" slot="content">
                <strong>${() => t('dataGrid.filterBy')}</strong>
                <ore-select
                  label=${() => t('companies.owner')}
                  variant="outline"
                  fullwidth
                  value=${owner}
                  ref=${ownerFilter}
                  @change=${(event: Event) => {
                    owner.value = selectValue(event);
                    filterOpen.value = false;
                  }}></ore-select>
                <ore-chip
                  mode="selectable"
                  color=${() => (closingOnly.value ? 'primary' : undefined)}
                  variant=${() => (closingOnly.value ? 'flat' : 'outline')}
                  ?checked=${closingOnly}
                  @change=${(event: CustomEvent<{ checked: boolean }>) => {
                    closingOnly.value = event.detail.checked;
                    filterOpen.value = false;
                  }}>
                  ${() => t('pipeline.closingIn45Days')}
                </ore-chip>
              </div>
            </ore-popover>
            <ore-popover
              placement="bottom-end"
              label=${() => t('pipeline.stageVisibility')}
              ?open=${stageVisibilityOpen}
              @open-change=${(event: CustomEvent<{ open: boolean }>) => {
                stageVisibilityOpen.value = event.detail.open;
              }}>
              <ore-button
                class="pipeline-stage-trigger"
                size="sm"
                variant=${() => (showCompleted.value ? 'flat' : 'ghost')}
                color=${() => (showCompleted.value ? 'primary' : undefined)}
                label=${() => t('pipeline.stageVisibility')}>
                <ore-icon slot="prefix" name="columns-3" size="16"></ore-icon>
                <span>${() => t(showCompleted.value ? 'pipeline.allStages' : 'pipeline.activeStages')}</span>
              </ore-button>
              <div class="pipeline-control-panel" slot="content">
                <ore-radio-group
                  name="stage-visibility"
                  label=${() => t('pipeline.stageVisibility')}
                  value=${() => (showCompleted.value ? 'all' : 'active')}
                  @change=${selectStageVisibility}>
                  <ore-radio value="active">${() => t('pipeline.activeStages')}</ore-radio>
                  <ore-radio value="all">${() => t('pipeline.allStages')}</ore-radio>
                </ore-radio-group>
              </div>
            </ore-popover>
          </div>
        </div>
        ${when(
          () => view.value === 'board' && searchOpen.value,
          () => html`
            <search class="pipeline-search-row" aria-label=${() => t('pipeline.searchDeals')}>
              <ore-input
                aria-label=${() => t('pipeline.searchDeals')}
                placeholder=${() => t('pipeline.searchDeals')}
                variant="outline"
                fullwidth
                clearable
                value=${query}
                ref=${searchInput}
                @input=${(event: Event) => {
                  query.value = (event.currentTarget as HTMLElement & { value: string }).value;
                }}>
                <ore-icon slot="prefix" name="search" size="16"></ore-icon>
              </ore-input>
              <ore-button
                icon-only
                size="sm"
                variant="ghost"
                label=${() => t('dataGrid.closeSearch')}
                @click=${() => {
                  query.value = '';
                  searchOpen.value = false;
                }}>
                <ore-icon name="x" size="16"></ore-icon>
              </ore-button>
            </search>
          `,
        )}
        <div class="pipeline-active-filters" ?hidden=${() => view.value !== 'board' || !filtersActive.value}>
          <div class="pipeline-active-filter-list">
            ${when(
              () => owner.value !== 'all',
              () => html`
                <ore-chip mode="action" variant="flat" color="primary" @click=${() => (owner.value = 'all')}>
                  ${() => t('pipeline.ownerNamed', { name: ownerById(owner.value)?.name ?? t('common.unknown') })}
                  <ore-icon slot="suffix" name="x" size="13"></ore-icon>
                </ore-chip>
              `,
            )}
            ${when(
              closingOnly,
              () => html`
                <ore-chip mode="action" variant="flat" color="primary" @click=${() => (closingOnly.value = false)}>
                  ${() => t('pipeline.closingIn45Days')}
                  <ore-icon slot="suffix" name="x" size="13"></ore-icon>
                </ore-chip>
              `,
            )}
          </div>
          <div class="pipeline-active-filter-meta">
            <span class="pipeline-result-count" aria-live="polite">
              ${() =>
                filtersActive.value
                  ? t('pipeline.filteredDealsCount', { count: filteredDeals.value, total: visibleDeals.value.length })
                  : t('pipeline.dealsCount', { count: filteredDeals.value })}
            </span>
            ${when(
              filtersActive,
              () => html`
                <ore-button
                  class="pipeline-clear-filters"
                  size="sm"
                  variant="text"
                  label=${() => t('dataGrid.clearFiltersAndSearch')}
                  @click=${clearFilters}>
                  <ore-icon slot="prefix" name="x" size="14"></ore-icon>
                  <span>${() => t('dataGrid.clearFiltersAndSearch')}</span>
                </ore-button>
              `,
            )}
          </div>
        </div>
      </div>
      <div class="pipeline-view" ?hidden=${() => view.value !== 'board'}>
        <div class="pipeline-board" style=${() => `--pipeline-columns:${visibleStageCount.value}`} ref=${board}>
          ${stages.map(
            (stage) => html`
              <section
                class="pipeline-column"
                data-stage=${stage.id}
                ?hidden=${() => !showCompleted.value && completedStages.has(stage.id)}>
                <header>
                  <span class="stage-marker"></span>
                  <h2>${stage.label}</h2>
                  <span>${() => filteredOpportunities(stage.id).length}</span>
                </header>
                <div class="pipeline-column__cards">
                  ${each(
                    () => filteredOpportunities(stage.id),
                    (item) => item.id,
                    (item) => pipelineCard(() => item.value, stage.label),
                  )}
                  ${when(
                    () => filteredOpportunities(stage.id).length === 0,
                    () => html`
                      <p class="pipeline-column__empty">${() => t('pipeline.noMatchingDeals')}</p>
                    `,
                  )}
                </div>
                <footer>
                  <span class="pipeline-column__total-label">${() => t('pipeline.stageTotal')}</span>
                  <strong class="pipeline-column__total-value">
                    ${() =>
                      formatAmount(
                        String(filteredOpportunities(stage.id).reduce((sum, item) => sum + Number(item.amount), 0)),
                      )}
                  </strong>
                </footer>
              </section>
            `,
          )}
        </div>
        <div class="pipeline-board-meta">
          <p class="pipeline-board-hint" id="pipeline-board-hint">
            <ore-icon name="info" size="14" aria-hidden="true"></ore-icon>
            <span>${() => t('pipeline.boardHint')}</span>
          </p>
          <div class="pipeline-stage-navigation" ?hidden=${() => !canScrollBack.value && !canScrollForward.value}>
            <span aria-live="polite">
              ${() =>
                stageEnd.value > stageIndex.value + 1
                  ? t('pipeline.stageRange', {
                      end: stageEnd.value,
                      start: stageIndex.value + 1,
                      total: visibleStageCount.value,
                    })
                  : t('pipeline.stagePosition', { current: stageIndex.value + 1, total: visibleStageCount.value })}
            </span>
            <ore-button
              icon-only
              size="sm"
              variant="outline"
              label=${() => t('pipeline.previousStage')}
              ?disabled=${() => !canScrollBack.value}
              @click=${() => scrollBoard(-1)}>
              <ore-icon name="arrow-left" size="15"></ore-icon>
            </ore-button>
            <ore-button
              icon-only
              size="sm"
              variant="outline"
              label=${() => t('pipeline.nextStage')}
              ?disabled=${() => !canScrollForward.value}
              @click=${() => scrollBoard(1)}>
              <ore-icon name="arrow-right" size="15"></ore-icon>
            </ore-button>
          </div>
        </div>
      </div>
      <ore-grid class="pipeline-forecast" cols="2" ?hidden=${() => view.value !== 'forecast'}>
        ${() =>
          stageTotals(crmData.value).map(
            (item) => html`
              <article
                data-stage=${item.stage}
                aria-label=${`${stages.find((stage) => stage.id === item.stage)!.label()}, ${formatAmount(String(item.value))}, ${t('pipeline.opportunitiesCount', { count: item.count })}, ${t(
                  'pipeline.relativeStageValue',
                  {
                    percent: ((item.value / maxStageValue.value) * 100).toFixed(0),
                    stage: stages.find((stage) => stage.id === item.stage)!.label(),
                  },
                )}`}>
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
                <small>${t('pipeline.relativeToLargestStage')}</small>
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
                <strong>
                  ${() =>
                    crmData.value.opportunities.find((opportunity) => opportunity.id === item.value.opportunityId)
                      ?.name ?? t('common.unknown')}
                </strong>
                <p>${() => item.value.description}</p>
                <small>${() => item.value.actor}</small>
              </div>
              <time datetime=${() => item.value.createdAt} title=${() => formatDate(item.value.createdAt)}>
                ${() => formatRelativeDate(item.value.createdAt)}
              </time>
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
