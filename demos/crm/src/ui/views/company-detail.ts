import '../components/activity-item';
import '../components/activity-signal';
import '../components/company-mark';
import '../components/owner-chip';
import '../components/stage-badge';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import { define, each, html, prop, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { formatAmount, formatDate, formatRelativeDate } from '../../core/format';
import { t } from '../../core/i18n';
import { routeHref, router } from '../../core/router';
import {
  companyActivities,
  companyById,
  companyContacts,
  companyLeads,
  companyOpportunities,
} from '../../core/selectors';
import { crmData, locale } from '../../core/store';
import { openRecordDialog } from '../components/record-dialog';
import { openRecordDrawer } from '../components/record-drawer';

type CompanyTab = 'activity' | 'contacts' | 'opportunities';

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

function healthLabel(value: string): string {
  if (value === 'healthy') return t('companies.healthy');
  if (value === 'watch') return t('recordDialog.watch');
  return t('companies.atRisk');
}

function tierLabel(value: string): string {
  return t(`recordDialog.${value}`);
}

define<{ company: string }>('crm-company-detail', {
  props: { company: prop.string('') },
  setup(props) {
    const tab = signal<CompanyTab>('activity');
    const company = computed(() => companyById(crmData.value, props.company.value));
    const contacts = computed(() => companyContacts(crmData.value, props.company.value));
    const leads = computed(() => companyLeads(crmData.value, props.company.value));
    const opportunities = computed(() => companyOpportunities(crmData.value, props.company.value));
    const activities = computed(() => companyActivities(crmData.value, props.company.value));
    const openOpportunities = computed(() => opportunities.value.filter((item) => !item.stage.startsWith('closed')));
    const openValue = computed(() => openOpportunities.value.reduce((sum, item) => sum + Number(item.amount), 0));
    const weightedValue = computed(() =>
      openOpportunities.value.reduce((sum, item) => sum + Number(item.amount) * (item.probability / 100), 0),
    );
    return html`
      ${when(
        () => company.value === undefined,
        () => html`
          <section class="profile-not-found">
            <company-mark name=${() => t('common.unknown')}></company-mark>
            <h1>${() => t('companyDetail.companyNotFound')}</h1>
            <p>${() => t('companyDetail.mayHaveBeenRemoved')}</p>
            <ore-button color="primary" @click=${() => void router.navigate({ name: 'companies' })}>
              ${() => t('action.backToCompanies')}
            </ore-button>
          </section>
        `,
      )}
      ${when(
        () => company.value !== undefined,
        () => html`
          <nav class="breadcrumb" aria-label=${() => t('nav.companyProfile')}>
            <a
              href=${routeHref(router.url('companies'))}
              @click=${(event: Event) => {
                event.preventDefault();
                void router.navigate({ name: 'companies' });
              }}>
              ${() => t('nav.companies')}
            </a>
            <ore-icon name="chevron-right" size="14"></ore-icon>
            <span>${() => company.value!.name}</span>
          </nav>
          <header class="company-hero">
            <company-mark name=${() => company.value!.name}></company-mark>
            <div class="company-hero__identity">
              <div>
                <h1>${() => company.value!.name}</h1>
                <ore-badge
                  color=${() => (company.value!.health === 'healthy' ? 'success' : company.value!.health === 'watch' ? 'warning' : 'error')}>
                  ${() => healthLabel(company.value!.health)}
                </ore-badge>
                <ore-badge variant="flat">${() => tierLabel(company.value!.tier)}</ore-badge>
              </div>
              <p>
                ${() => `${industryLabel(company.value!.industry)} · ${company.value!.city}, ${company.value!.country}`}
              </p>
              <a href=${() => `https://${company.value!.website}`} target="_blank" rel="noreferrer">
                ${() => company.value!.website}
              </a>
            </div>
            <div class="company-hero__actions">
              ${when(
                () => can('create'),
                () => html`
                  <ore-button
                    variant="outline"
                    @click=${() => openRecordDialog('contact', undefined, props.company.value)}>
                    <ore-icon slot="prefix" name="user-plus" size="16"></ore-icon>
                    ${() => t('action.addContact')}
                  </ore-button>
                  <ore-button
                    variant="outline"
                    @click=${() => openRecordDialog('opportunity', undefined, props.company.value)}>
                    <ore-icon slot="prefix" name="circle-dollar-sign" size="16"></ore-icon>
                    ${() => t('action.newOpportunity')}
                  </ore-button>
                `,
              )}${when(
                () => can('update'),
                () => html`
                  <ore-button color="primary" @click=${() => openRecordDialog('company', props.company.value)}>
                    <ore-icon slot="prefix" name="pencil" size="16"></ore-icon>
                    ${() => t('action.editCompany')}
                  </ore-button>
                `,
              )}
            </div>
          </header>
          <section class="profile-metrics" aria-label=${() => t('dashboard.salesMetrics')}>
            <ore-stats
              size="sm"
              variant="plain"
              label=${() => t('companyDetail.annualRevenue')}
              value=${() => formatAmount(company.value!.revenue)}
              description=${() => `${company.value!.employees.toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-GB')} ${t('companyDetail.employees')}`}></ore-stats>
            <ore-stats
              size="sm"
              variant="plain"
              label=${() => t('companyDetail.openPipeline')}
              value=${() => formatAmount(String(openValue.value))}
              description=${() => `${openOpportunities.value.length} ${t('companyDetail.activeDeals')}`}></ore-stats>
            <ore-stats
              size="sm"
              variant="plain"
              label=${() => t('pipeline.weightedForecast')}
              value=${() => formatAmount(String(weightedValue.value))}
              description=${() => t('companyDetail.probabilityAdjusted')}></ore-stats>
            <ore-stats
              size="sm"
              variant="plain"
              label=${() => t('companyDetail.relationships')}
              value=${() => String(contacts.value.length)}
              description=${() => `${leads.value.length} ${t('companyDetail.leads')}`}></ore-stats>
          </section>
          <div class="company-workspace">
            <section class="company-main">
              <ore-tabs
                class="workspace-tabs"
                density="compact"
                variant="ghost"
                color="primary"
                label=${() => t('nav.companyProfile')}
                value=${tab}
                @change=${(event: CustomEvent<{ value: CompanyTab }>) => {
                  tab.value = event.detail.value;
                }}>
                <ore-tab-item slot="tabs" value="activity">
                  ${() => t('companyDetail.activity')}
                  <span>${() => activities.value.length}</span>
                </ore-tab-item>
                <ore-tab-item slot="tabs" value="opportunities">
                  ${() => t('companyDetail.opportunities')}
                  <span>${() => opportunities.value.length}</span>
                </ore-tab-item>
                <ore-tab-item slot="tabs" value="contacts">
                  ${() => t('companyDetail.contacts')}
                  <span>${() => contacts.value.length}</span>
                </ore-tab-item>
              </ore-tabs>
              <activity-signal activities=${activities} companyId=${() => props.company.value}></activity-signal>
              ${when(
                () => tab.value === 'activity',
                () => html`
                  <div class="profile-timeline">
                    ${each(
                      () => activities.value.slice(0, 20),
                      (item) => item.id,
                      (item) => html`
                        <article>
                          <span class=${() => `activity-kind activity-kind--${item.value.category}`}>
                            <ore-icon
                              name=${() => (item.value.category === 'email' ? 'mail' : item.value.category === 'meeting' ? 'calendar' : item.value.category === 'call' ? 'phone' : 'activity')}
                              size="15"></ore-icon>
                          </span>
                          <div>
                            <strong>${() => item.value.actor}</strong>
                            <p>${() => item.value.description}</p>
                          </div>
                          <time>${() => formatDate(item.value.createdAt)}</time>
                        </article>
                      `,
                    )}
                  </div>
                `,
              )}
              ${when(
                () => tab.value === 'opportunities',
                () => html`
                  <div class="profile-records">
                    ${each(
                      opportunities,
                      (item) => item.id,
                      (item) => html`
                        <button type="button" @click=${() => openRecordDrawer('opportunity', item.value.id)}>
                          <div>
                            <strong>${() => item.value.name}</strong>
                            <span>${() => formatDate(item.value.expectedClose)}</span>
                          </div>
                          <stage-badge stage=${() => item.value.stage}></stage-badge>
                          <b>${() => formatAmount(item.value.amount)}</b>
                        </button>
                      `,
                    )}
                  </div>
                `,
              )}
              ${when(
                () => tab.value === 'contacts',
                () => html`
                  <div class="profile-records">
                    ${each(
                      contacts,
                      (item) => item.id,
                      (item) => html`
                        <button type="button" @click=${() => openRecordDrawer('contact', item.value.id)}>
                          <div>
                            <strong>${() => item.value.name}</strong>
                            <span>${() => item.value.title}</span>
                          </div>
                          <owner-chip owner-id=${() => item.value.ownerId}></owner-chip>
                          <b>${() => t(item.value.status === 'active' ? 'contacts.active' : 'contacts.inactive')}</b>
                        </button>
                      `,
                    )}
                  </div>
                `,
              )}
            </section>
            <aside class="company-facts">
              <section>
                <header><h2>${() => t('companyDetail.companyDetails')}</h2></header>
                <dl>
                  <div>
                    <dt>${() => t('companyDetail.owner')}</dt>
                    <dd><owner-chip owner-id=${() => company.value!.ownerId}></owner-chip></dd>
                  </div>
                  <div>
                    <dt>${() => t('companyDetail.industry')}</dt>
                    <dd>${() => industryLabel(company.value!.industry)}</dd>
                  </div>
                  <div>
                    <dt>${() => t('companyDetail.tier')}</dt>
                    <dd>${() => tierLabel(company.value!.tier)}</dd>
                  </div>
                  <div>
                    <dt>${() => t('companyDetail.employees')}</dt>
                    <dd>${() => company.value!.employees.toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-GB')}</dd>
                  </div>
                  <div>
                    <dt>${() => t('companyDetail.location')}</dt>
                    <dd>${() => `${company.value!.city}, ${company.value!.country}`}</dd>
                  </div>
                  <div>
                    <dt>${() => t('companyDetail.lastActivity')}</dt>
                    <dd>${() => formatRelativeDate(company.value!.lastActivityAt)}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <header>
                  <h2>${() => t('companyDetail.primaryContacts')}</h2>
                  <span>${() => contacts.value.length}</span>
                </header>
                <div class="profile-contact-list">
                  ${each(
                    () => contacts.value.slice(0, 4),
                    (item) => item.id,
                    (item) => html`
                      <button type="button" @click=${() => openRecordDrawer('contact', item.value.id)}>
                        <span>
                          ${() =>
                            item.value.name
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)}
                        </span>
                        <strong>${() => item.value.name}</strong>
                        <small>${() => item.value.title}</small>
                      </button>
                    `,
                  )}
                </div>
              </section>
            </aside>
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createCompanyDetailView(companyId: string): HTMLElement {
  const element = document.createElement('crm-company-detail');
  element.setAttribute('company', companyId);
  return element;
}
