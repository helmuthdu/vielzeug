import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/select';
import '@vielzeug/refine/step';
import '@vielzeug/refine/stepper';
import { define, each, html, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { formatAmount, formatDate, formatRelativeDate } from '../../core/format';
import { moveOpportunity } from '../../core/history';
import { t } from '../../core/i18n';
import { canTransition } from '../../core/opportunity-machine';
import type { RecordKind } from '../../core/record-actions';
import { crmData } from '../../core/store';
import type { OpportunityStage } from '../../core/types';
import { openRecordDialog } from './record-dialog';

interface RecordDrawerRequest {
  id: string;
  kind: RecordKind;
}

const request = signal<RecordDrawerRequest | null>(null);
const open = signal(false);
const opportunityStages: OpportunityStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
];

export function openRecordDrawer(kind: RecordKind, id: string): void {
  request.value = { id, kind };
  open.value = true;
}

function ownerName(id: string): string {
  return id === 'alex' ? t('common.alexMorgan') : id === 'sarah' ? t('common.sarahChen') : t('common.guest');
}

function recordKindLabel(kind: RecordKind): string {
  if (kind === 'company') return t('companies.company');
  if (kind === 'contact') return t('recordDialog.contact');
  if (kind === 'lead') return t('leads.lead');
  return t('opportunities.opportunity');
}

function leadStatusLabel(status: string): string {
  if (status === 'new') return t('leads.new');
  if (status === 'working') return t('leads.working');
  if (status === 'qualified') return t('leads.qualified');
  return status;
}

function leadSourceLabel(source: string): string {
  if (source === 'Inbound') return t('recordDialog.inbound');
  if (source === 'Outbound') return t('recordDialog.outbound');
  if (source === 'Referral') return t('recordDialog.referral');
  if (source === 'Event') return t('recordDialog.event');
  return source;
}

function opportunityStageLabel(stage: string): string {
  if (stage === 'prospecting') return t('pipeline.prospecting');
  if (stage === 'qualification') return t('pipeline.qualification');
  if (stage === 'proposal') return t('pipeline.proposal');
  if (stage === 'negotiation') return t('pipeline.negotiation');
  if (stage === 'closed-won') return t('pipeline.closedWon');
  if (stage === 'closed-lost') return t('pipeline.closedLost');
  return stage;
}

define('crm-record-drawer', {
  setup() {
    const company = computed(() =>
      request.value?.kind === 'company'
        ? (crmData.value.companies.find((item) => item.id === request.value?.id) ?? null)
        : null,
    );
    const contact = computed(() =>
      request.value?.kind === 'contact'
        ? (crmData.value.contacts.find((item) => item.id === request.value?.id) ?? null)
        : null,
    );
    const lead = computed(() =>
      request.value?.kind === 'lead'
        ? (crmData.value.leads.find((item) => item.id === request.value?.id) ?? null)
        : null,
    );
    const opportunity = computed(() =>
      request.value?.kind === 'opportunity'
        ? (crmData.value.opportunities.find((item) => item.id === request.value?.id) ?? null)
        : null,
    );
    const stageOptions = computed(() => {
      const current = opportunity.value;
      if (!current) return [];
      return opportunityStages
        .filter((stage) => stage === current.stage || canTransition(current.id, current.stage, stage))
        .map((stage) => ({ label: opportunityStageLabel(stage), value: stage }));
    });
    const recordName = computed(
      () =>
        company.value?.name ??
        contact.value?.name ??
        lead.value?.name ??
        opportunity.value?.name ??
        t('recordDrawer.recordDetails'),
    );
    const relatedCompany = computed(() => {
      const companyId = contact.value?.companyId ?? lead.value?.companyId ?? opportunity.value?.companyId;
      return crmData.value.companies.find((item) => item.id === companyId) ?? null;
    });
    const relatedContact = computed(
      () => crmData.value.contacts.find((item) => item.id === opportunity.value?.contactId) ?? null,
    );
    const companyContacts = computed(() =>
      company.value ? crmData.value.contacts.filter((item) => item.companyId === company.value?.id).slice(0, 5) : [],
    );
    const companyPipeline = computed(() =>
      company.value
        ? crmData.value.opportunities
            .filter((item) => item.companyId === company.value?.id && !item.stage.startsWith('closed'))
            .reduce((sum, item) => sum + Number(item.amount), 0)
        : 0,
    );
    const activities = computed(() =>
      crmData.value.activities
        .filter((item) => {
          if (company.value) return item.companyId === company.value.id;
          if (contact.value) return item.contactId === contact.value.id || item.companyId === contact.value.companyId;
          if (opportunity.value) return item.opportunityId === opportunity.value.id;
          return false;
        })
        .slice(0, 6),
    );
    const timelineActivities = computed(() => activities.value.slice().reverse());
    const move = (event: Event): void => {
      const current = opportunity.value;
      const detail = (event as CustomEvent<{ value?: string; values?: string[] }>).detail;
      const stage =
        detail?.value ?? detail?.values?.[0] ?? (event.currentTarget as HTMLElement & { value: string }).value;
      if (current && stage && stage !== current.stage) void moveOpportunity(current.id, stage as OpportunityStage);
    };
    const edit = (): void => {
      const current = request.value;
      if (!current) return;
      open.value = false;
      setTimeout(() => openRecordDialog(current.kind, current.id), 220);
    };

    return html`
      <ore-drawer
        placement="right"
        size="lg"
        title=${recordName}
        ?open=${open}
        @open-change=${(event: Event) => {
          open.value = (event as CustomEvent<{ open: boolean }>).detail.open;
        }}>
        ${when(
          () => company.value !== null,
          () => html`
            <div class="record-summary">
              <ore-badge>${() => company.value!.industry}</ore-badge>
              <strong>${() => formatAmount(company.value!.revenue)}</strong>
              <span>${() => t('recordDrawer.annualRevenue')}</span>
            </div>
            <dl class="detail-list">
              <div>
                <dt>${() => t('recordDrawer.owner')}</dt>
                <dd>${() => ownerName(company.value!.ownerId)}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.openPipeline')}</dt>
                <dd>${() => formatAmount(String(companyPipeline.value))}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.lastActivity')}</dt>
                <dd>${() => formatDate(company.value!.lastActivityAt)}</dd>
              </div>
            </dl>
            <section class="drawer-section">
              <h3>${() => t('recordDrawer.contacts')}</h3>
              <div class="related-list">
                ${each(
                  companyContacts,
                  (item) => item.id,
                  (item) => html`
                    <button type="button" @click=${() => openRecordDrawer('contact', item.value.id)}>
                      <strong>${() => item.value.name}</strong>
                      <span>${() => item.value.title}</span>
                    </button>
                  `,
                )}
              </div>
            </section>
          `,
        )}
        ${when(
          () => contact.value !== null,
          () => html`
            <div class="record-summary">
              <ore-badge color=${() => (contact.value!.status === 'active' ? 'success' : 'neutral')}>
                ${() => t(contact.value!.status === 'active' ? 'contacts.active' : 'contacts.inactive')}
              </ore-badge>
              <strong>${() => contact.value!.title}</strong>
              <span>${() => relatedCompany.value?.name ?? t('recordDrawer.unknownCompany')}</span>
            </div>
            <dl class="detail-list">
              <div>
                <dt>${() => t('recordDrawer.email')}</dt>
                <dd><a href=${() => `mailto:${contact.value!.email}`}>${() => contact.value!.email}</a></dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.owner')}</dt>
                <dd>${() => ownerName(contact.value!.ownerId)}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.lastContact')}</dt>
                <dd>${() => formatDate(contact.value!.lastContactAt)}</dd>
              </div>
            </dl>
          `,
        )}
        ${when(
          () => lead.value !== null,
          () => html`
            <div class="record-summary">
              <ore-badge>${() => leadStatusLabel(lead.value!.status)}</ore-badge>
              <strong>${() => leadSourceLabel(lead.value!.source)}</strong>
              <span>${() => relatedCompany.value?.name ?? t('recordDrawer.unknownCompany')}</span>
            </div>
            <dl class="detail-list">
              <div>
                <dt>${() => t('recordDrawer.owner')}</dt>
                <dd>${() => ownerName(lead.value!.ownerId)}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.created')}</dt>
                <dd>${() => formatDate(lead.value!.createdAt)}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.age')}</dt>
                <dd>${() => formatRelativeDate(lead.value!.createdAt)}</dd>
              </div>
            </dl>
          `,
        )}
        ${when(
          () => opportunity.value !== null,
          () => html`
            <div class="record-summary">
              <ore-badge>${() => opportunityStageLabel(opportunity.value!.stage)}</ore-badge>
              <strong>${() => formatAmount(opportunity.value!.amount)}</strong>
              <span>${() => t('recordDrawer.probability', { count: opportunity.value!.probability })}</span>
            </div>
            ${when(
              () => can('update'),
              () => html`
                <div class="drawer-stage-control">
                  <ore-select
                    label=${() => t('pipeline.moveToStage')}
                    options=${stageOptions}
                    value=${() => opportunity.value!.stage}
                    @change=${move}></ore-select>
                </div>
              `,
            )}
            <dl class="detail-list">
              <div>
                <dt>${() => t('recordDrawer.company')}</dt>
                <dd>${() => relatedCompany.value?.name ?? t('recordDrawer.unknownCompany')}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.contact')}</dt>
                <dd>${() => relatedContact.value?.name ?? t('recordDrawer.noContact')}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.owner')}</dt>
                <dd>${() => ownerName(opportunity.value!.ownerId)}</dd>
              </div>
              <div>
                <dt>${() => t('recordDrawer.expectedClose')}</dt>
                <dd>${() => formatDate(opportunity.value!.expectedClose)}</dd>
              </div>
            </dl>
          `,
        )}
        ${when(
          () => activities.value.length > 0,
          () => html`
            <section class="drawer-section">
              <h3>${() => t('recordDrawer.recentActivity')}</h3>
              <ore-stepper
                class="drawer-timeline"
                orientation="vertical"
                size="sm"
                color="primary"
                label=${() => t('recordDrawer.recentActivity')}
                value=${() => timelineActivities.value.at(-1)?.id ?? ''}>
                ${() =>
                  timelineActivities.value.map(
                    (item) => html`
                      <ore-step value=${item.id}>
                        ${item.actor}
                        <span slot="description">
                          <span>${item.description}</span>
                          <time>${formatRelativeDate(item.createdAt)}</time>
                        </span>
                      </ore-step>
                    `,
                  )}
              </ore-stepper>
            </section>
          `,
        )}
        ${when(
          () => request.value !== null && can('update'),
          () => html`
            <div slot="footer">
              <ore-button color="primary" @click=${edit}>
                <ore-icon slot="prefix" name="pencil" size="16"></ore-icon>
                ${() => {
                  const kind = request.value?.kind;
                  return kind ? t('recordDrawer.editKind', { kind: recordKindLabel(kind) }) : '';
                }}
              </ore-button>
            </div>
          `,
        )}
      </ore-drawer>
    `;
  },
  shadow: false,
});
