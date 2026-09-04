import '../components/company-mark';
import '../components/owner-chip';
import '../components/stage-badge';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/combobox';
import '@vielzeug/refine/datagrid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/select';
import '@vielzeug/refine/stats';
import { define, html, when } from '@vielzeug/ore';
import type { DataGridColumn, DataGridView, FilterOption } from '@vielzeug/refine/datagrid';
import { computed, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { dateFilterValue, formatAmount, formatDate } from '../../core/format';
import { t } from '../../core/i18n';
import type { RecordKind } from '../../core/record-actions';
import { router } from '../../core/router';
import { companyOpportunities, conversion, openPipeline, weightedPipeline } from '../../core/selectors';
import { crmData } from '../../core/store';
import type { Company, Lead, Opportunity } from '../../core/types';
import { openRecordDialog } from '../components/record-dialog';
import { openRecordDrawer } from '../components/record-drawer';
import { categoricalOperators, crmDataGridLabels } from '../datagrid';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const industryKeys: Record<string, string> = {
  Energy: 'recordDialog.energy',
  'Financial Services': 'recordDialog.financialServices',
  Healthcare: 'recordDialog.healthcare',
  Logistics: 'recordDialog.logistics',
  Manufacturing: 'recordDialog.manufacturing',
  Media: 'recordDialog.media',
  Software: 'recordDialog.software',
};

function industryLabel(value: string): string {
  return industryKeys[value] ? t(industryKeys[value]) : value;
}

function sourceLabel(value: string): string {
  return value ? t(`recordDialog.${value.toLocaleLowerCase()}`) : '';
}

function tierLabel(value: string): string {
  return t(`recordDialog.${value}`);
}

function ownerLabel(ownerId: string): string {
  return t(ownerId === 'alex' ? 'common.alexMorgan' : 'common.sarahChen');
}

function companyOpenPipeline(company: Company): number {
  return companyOpportunities(crmData.value, company.id)
    .filter((opportunity) => !opportunity.stage.startsWith('closed'))
    .reduce((sum, opportunity) => sum + Number(opportunity.amount), 0);
}

function tableShell(
  title: () => string,
  description: () => string,
  kind: RecordKind,
  createLabel: () => string,
  summary: unknown,
  grid: unknown,
) {
  return html`
    <header class="page-heading">
      <div>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${when(
        () => can('create'),
        () => html`
          <ore-button color="primary" @click=${() => openRecordDialog(kind)}>
            <ore-icon slot="prefix" name="plus" size="16"></ore-icon>
            ${createLabel}
          </ore-button>
        `,
      )}
    </header>
    ${summary} ${grid}
  `;
}

define('crm-companies-view', {
  setup() {
    const activeView = signal<'all' | 'healthy' | 'risk'>('all');
    const labels = computed(crmDataGridLabels);
    const views = computed<DataGridView<Company>[]>(() => [
      { id: 'all', label: t('companies.allAccounts') },
      { filter: (company) => company.health === 'healthy', id: 'healthy', label: t('companies.healthy') },
      { filter: (company) => company.health === 'risk', id: 'risk', label: t('companies.atRisk') },
    ]);
    const columns = computed<DataGridColumn<Company>[]>(() => [
      {
        cell: (company) => company.name,
        key: 'name',
        label: t('companies.company'),
        renderCell: (company) => html`
          <a
            part="company-cell"
            href=${`/companies/${company.id}`}
            @click=${(event: Event) => {
              event.preventDefault();
              void router.navigate({ name: 'companyDetail', params: { id: company.id } });
            }}>
            <company-mark name=${company.name}></company-mark>
            <span part="company-cell-copy">
              <strong part="cell-primary">${company.name}</strong>
              <small part="cell-secondary">${company.website} · ${tierLabel(company.tier)}</small>
            </span>
          </a>
        `,
        sortable: true,
        width: '22rem',
      },
      {
        cell: (company) =>
          t(
            company.health === 'healthy'
              ? 'companies.healthy'
              : company.health === 'watch'
                ? 'recordDialog.watch'
                : 'companies.atRisk',
          ),
        key: 'health',
        label: t('companies.health'),
        renderCell: (company) => html`
          <ore-badge
            color=${company.health === 'healthy' ? 'success' : company.health === 'watch' ? 'warning' : 'error'}>
            ${t(
              company.health === 'healthy'
                ? 'companies.healthy'
                : company.health === 'watch'
                  ? 'recordDialog.watch'
                  : 'companies.atRisk',
            )}
          </ore-badge>
        `,
        sortable: true,
        width: '8rem',
      },
      {
        cell: (company) => ownerLabel(company.ownerId),
        key: 'ownerId',
        label: t('companies.owner'),
        renderCell: (company) => html`
          <owner-chip owner-id=${company.ownerId}></owner-chip>
        `,
        sortable: true,
        width: '10rem',
      },
      {
        cell: (company) => String(crmData.value.contacts.filter((contact) => contact.companyId === company.id).length),
        key: 'contacts',
        label: t('companies.contacts'),
        sortable: true,
        sortType: 'number',
        sortValue: (company) => crmData.value.contacts.filter((contact) => contact.companyId === company.id).length,
        width: '7rem',
      },
      {
        cell: (company) => formatAmount(String(companyOpenPipeline(company))),
        filterValue: companyOpenPipeline,
        key: 'openPipeline',
        label: t('companies.openPipeline'),
        sortable: true,
        sortType: 'number',
        sortValue: companyOpenPipeline,
        width: '10rem',
      },
      {
        cell: (company) => formatDate(company.lastActivityAt, 'short'),
        filterLabel: (company) => formatDate(company.lastActivityAt, 'short'),
        filterValue: (company) => dateFilterValue(company.lastActivityAt),
        key: 'lastActivityAt',
        label: t('companies.lastActivity'),
        sortable: true,
        sortValue: (company) => Date.parse(company.lastActivityAt),
        width: '9rem',
      },
    ]);
    const filterOptions = computed<FilterOption[]>(() => [
      {
        key: 'industry',
        label: t('companies.industry'),
        operators: categoricalOperators(),
        options: [...new Set(crmData.value.companies.map((company) => company.industry))].map((value) => ({
          label: industryLabel(value),
          value,
        })),
      },
      {
        key: 'ownerId',
        label: t('companies.owner'),
        operators: categoricalOperators(),
        options: [
          { label: t('common.alexMorgan'), value: 'alex' },
          { label: t('common.sarahChen'), value: 'sarah' },
        ],
      },
    ]);

    return tableShell(
      () => t('nav.companies'),
      () => t('companies.accountsOwnership'),
      'company',
      () => t('action.newCompany'),
      html`
        <section class="record-metrics">
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('companies.totalAccounts')}
            value=${() => String(crmData.value.companies.length)}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('companies.healthy')}
            value=${() => String(crmData.value.companies.filter((item) => item.health === 'healthy').length)}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('companies.atRisk')}
            value=${() => String(crmData.value.companies.filter((item) => item.health === 'risk').length)}></ore-stats>
        </section>
      `,
      html`
        <ore-datagrid
          class="crm-datagrid"
          density="compact"
          fullwidth
          active-view=${activeView}
          label=${() => t('nav.companies')}
          columns=${columns}
          rows=${() => crmData.value.companies}
          views=${views}
          filterOptions=${filterOptions}
          labels=${labels}
          empty-text=${() => t('companies.noCompaniesFound')}
          page-size="10"
          pageSizeOptions=${PAGE_SIZE_OPTIONS}
          @view-change=${(event: CustomEvent<{ id: 'all' | 'healthy' | 'risk' }>) => {
            activeView.value = event.detail.id;
          }}></ore-datagrid>
      `,
    );
  },
  shadow: false,
});

type OpportunityGridRow = Opportunity & { companyName: string; ownerName: string };

define('crm-opportunities-view', {
  setup() {
    const activeView = signal<'all' | 'lost' | 'open' | 'won'>('all');
    const labels = computed(crmDataGridLabels);
    const views = computed<DataGridView<OpportunityGridRow>[]>(() => [
      { id: 'all', label: t('opportunities.allOpportunities') },
      { filter: (opportunity) => !opportunity.stage.startsWith('closed'), id: 'open', label: t('opportunities.open') },
      { filter: (opportunity) => opportunity.stage === 'closed-won', id: 'won', label: t('opportunities.won') },
      { filter: (opportunity) => opportunity.stage === 'closed-lost', id: 'lost', label: t('opportunities.lost') },
    ]);
    const rows = computed<OpportunityGridRow[]>(() =>
      crmData.value.opportunities.map((opportunity) => ({
        ...opportunity,
        companyName:
          crmData.value.companies.find((company) => company.id === opportunity.companyId)?.name ?? t('common.unknown'),
        ownerName: ownerLabel(opportunity.ownerId),
      })),
    );
    const columns = computed<DataGridColumn<OpportunityGridRow>[]>(() => [
      {
        cell: (opportunity) => opportunity.name,
        key: 'name',
        label: t('opportunities.opportunity'),
        renderCell: (opportunity) => html`
          <button part="entity-link" type="button" @click=${() => openRecordDrawer('opportunity', opportunity.id)}>
            ${opportunity.name}
          </button>
        `,
        sortable: true,
        width: '18rem',
      },
      { key: 'companyName', label: t('opportunities.company'), sortable: true, width: '12rem' },
      {
        cell: (opportunity) =>
          t(`pipeline.${opportunity.stage.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`),
        key: 'stage',
        label: t('opportunities.stage'),
        renderCell: (opportunity) => html`
          <stage-badge stage=${opportunity.stage}></stage-badge>
        `,
        sortable: true,
        width: '10rem',
      },
      {
        cell: (opportunity) => formatAmount(opportunity.amount),
        key: 'amount',
        label: t('opportunities.amount'),
        sortable: true,
        sortType: 'number',
        sortValue: (opportunity) => Number(opportunity.amount),
        width: '9rem',
      },
      {
        cell: (opportunity) => `${opportunity.probability}%`,
        key: 'probability',
        label: t('opportunities.probability'),
        sortable: true,
        sortType: 'number',
        sortValue: (opportunity) => opportunity.probability,
        width: '8rem',
      },
      {
        cell: (opportunity) => formatDate(opportunity.expectedClose, 'short'),
        filterLabel: (opportunity) => formatDate(opportunity.expectedClose, 'short'),
        filterValue: (opportunity) => dateFilterValue(opportunity.expectedClose),
        key: 'expectedClose',
        label: t('opportunities.expectedClose'),
        sortable: true,
        sortValue: (opportunity) => Date.parse(opportunity.expectedClose),
        width: '10rem',
      },
      {
        cell: (opportunity) => opportunity.ownerName,
        key: 'ownerId',
        label: t('opportunities.owner'),
        renderCell: (opportunity) => html`
          <owner-chip owner-id=${opportunity.ownerId}></owner-chip>
        `,
        sortable: true,
        width: '10rem',
      },
    ]);
    const filterOptions = computed<FilterOption[]>(() => [
      {
        key: 'stage',
        label: t('opportunities.stage'),
        operators: categoricalOperators(),
        options: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'].map(
          (value) => ({
            label: t(`pipeline.${value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`),
            value,
          }),
        ),
      },
      {
        key: 'ownerId',
        label: t('opportunities.owner'),
        operators: categoricalOperators(),
        options: [
          { label: t('common.alexMorgan'), value: 'alex' },
          { label: t('common.sarahChen'), value: 'sarah' },
        ],
      },
    ]);

    return tableShell(
      () => t('nav.opportunities'),
      () => t('opportunities.forecastValue'),
      'opportunity',
      () => t('action.newOpportunity'),
      html`
        <section class="record-metrics record-metrics--four">
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('companies.openPipeline')}
            value=${() => formatAmount(String(openPipeline(crmData.value)))}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('pipeline.weightedForecast')}
            value=${() => formatAmount(String(weightedPipeline(crmData.value)))}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('opportunities.averageConfidence')}
            value=${() => `${Math.round(crmData.value.opportunities.reduce((sum, item) => sum + item.probability, 0) / crmData.value.opportunities.length)}%`}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('opportunities.won')}
            value=${() => String(crmData.value.opportunities.filter((item) => item.stage === 'closed-won').length)}></ore-stats>
        </section>
      `,
      html`
        <ore-datagrid
          class="crm-datagrid"
          density="compact"
          fullwidth
          active-view=${activeView}
          label=${() => t('nav.opportunities')}
          columns=${columns}
          rows=${rows}
          views=${views}
          filterOptions=${filterOptions}
          labels=${labels}
          empty-text=${() => t('opportunities.noOpportunitiesFound')}
          page-size="10"
          pageSizeOptions=${PAGE_SIZE_OPTIONS}
          @view-change=${(event: CustomEvent<{ id: 'all' | 'lost' | 'open' | 'won' }>) => {
            activeView.value = event.detail.id;
          }}></ore-datagrid>
      `,
    );
  },
  shadow: false,
});

type LeadGridRow = Lead & { companyName: string; ownerName: string };

define('crm-leads-view', {
  setup() {
    const activeView = signal<'all' | 'new' | 'qualified' | 'working'>('all');
    const labels = computed(crmDataGridLabels);
    const views = computed<DataGridView<LeadGridRow>[]>(() => [
      { id: 'all', label: t('leads.allLeads') },
      { filter: (lead) => lead.status === 'new', id: 'new', label: t('leads.new') },
      { filter: (lead) => lead.status === 'working', id: 'working', label: t('leads.working') },
      { filter: (lead) => lead.status === 'qualified', id: 'qualified', label: t('leads.qualified') },
    ]);
    const rows = computed<LeadGridRow[]>(() =>
      crmData.value.leads.map((lead) => ({
        ...lead,
        companyName:
          crmData.value.companies.find((company) => company.id === lead.companyId)?.name ?? t('common.unknown'),
        ownerName: ownerLabel(lead.ownerId),
      })),
    );
    const columns = computed<DataGridColumn<LeadGridRow>[]>(() => [
      {
        cell: (lead) => lead.name,
        key: 'name',
        label: t('leads.lead'),
        renderCell: (lead) => html`
          <button part="entity-link" type="button" @click=${() => openRecordDrawer('lead', lead.id)}>
            ${lead.name}
          </button>
        `,
        sortable: true,
        width: '16rem',
      },
      { key: 'companyName', label: t('leads.company'), sortable: true, width: '12rem' },
      {
        cell: (lead) => sourceLabel(lead.source),
        key: 'source',
        label: t('leads.source'),
        sortable: true,
        width: '9rem',
      },
      {
        cell: (lead) => t(`leads.${lead.status}`),
        key: 'status',
        label: t('leads.status'),
        renderCell: (lead) => html`
          <ore-badge>${t(`leads.${lead.status}`)}</ore-badge>
        `,
        sortable: true,
        width: '9rem',
      },
      { key: 'ownerName', label: t('companies.owner'), sortable: true, width: '10rem' },
      {
        cell: (lead) => formatDate(lead.createdAt, 'short'),
        filterLabel: (lead) => formatDate(lead.createdAt, 'short'),
        filterValue: (lead) => dateFilterValue(lead.createdAt),
        key: 'createdAt',
        label: t('leads.created'),
        sortable: true,
        sortValue: (lead) => Date.parse(lead.createdAt),
        width: '9rem',
      },
    ]);
    const filterOptions = computed<FilterOption[]>(() => [
      {
        key: 'status',
        label: t('leads.status'),
        operators: categoricalOperators(),
        options: ['new', 'working', 'qualified'].map((value) => ({ label: t(`leads.${value}`), value })),
      },
      {
        key: 'source',
        label: t('leads.source'),
        operators: categoricalOperators(),
        options: [...new Set(crmData.value.leads.map((lead) => lead.source))].map((value) => ({
          label: sourceLabel(value),
          value,
        })),
      },
    ]);

    return tableShell(
      () => t('nav.leads'),
      () => t('leads.newDemand'),
      'lead',
      () => t('action.newLead'),
      html`
        <section class="record-metrics record-metrics--four">
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('leads.new')}
            value=${() => String(crmData.value.leads.filter((item) => item.status === 'new').length)}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('leads.working')}
            value=${() => String(crmData.value.leads.filter((item) => item.status === 'working').length)}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('leads.qualified')}
            value=${() => String(crmData.value.leads.filter((item) => item.status === 'qualified').length)}></ore-stats>
          <ore-stats
            size="sm"
            variant="plain"
            label=${() => t('leads.conversion')}
            value=${() => `${conversion(crmData.value).toFixed(1)}%`}></ore-stats>
        </section>
      `,
      html`
        <ore-datagrid
          class="crm-datagrid"
          density="compact"
          fullwidth
          active-view=${activeView}
          label=${() => t('nav.leads')}
          columns=${columns}
          rows=${rows}
          views=${views}
          filterOptions=${filterOptions}
          labels=${labels}
          empty-text=${() => t('leads.noLeadsFound')}
          page-size="10"
          pageSizeOptions=${PAGE_SIZE_OPTIONS}
          @view-change=${(event: CustomEvent<{ id: 'all' | 'new' | 'qualified' | 'working' }>) => {
            activeView.value = event.detail.id;
          }}></ore-datagrid>
      `,
    );
  },
  shadow: false,
});

export const createCompaniesView = (): HTMLElement => document.createElement('crm-companies-view');
export const createOpportunitiesView = (): HTMLElement => document.createElement('crm-opportunities-view');
export const createLeadsView = (): HTMLElement => document.createElement('crm-leads-view');
