import '../components/company-mark';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/combobox';
import '@vielzeug/refine/datagrid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/select';
import { define, html, when } from '@vielzeug/ore';
import type { DataGridColumn, DataGridView, FilterOption } from '@vielzeug/refine/datagrid';
import { computed, signal } from '@vielzeug/ripple';
import { can } from '../../core/auth';
import { dateFilterValue, formatDate, formatRelativeDate } from '../../core/format';
import { t } from '../../core/i18n';
import { crmData } from '../../core/store';
import type { Contact } from '../../core/types';
import { openRecordDialog } from '../components/record-dialog';
import { openRecordDrawer } from '../components/record-drawer';
import { categoricalOperators, crmDataGridLabels } from '../datagrid';

const CONTACT_REFERENCE_TIME = Date.parse('2026-08-31T12:00:00Z');
const PAGE_SIZE_OPTIONS = [10, 25, 50];

type ContactGridRow = Contact & { companyName: string; statusLabel: string };
type ContactView = 'all' | 'follow-up' | 'recent';

function contactAgeDays(contact: Contact): number {
  return (CONTACT_REFERENCE_TIME - Date.parse(contact.lastContactAt)) / 86_400_000;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

define('crm-contacts-view', {
  setup() {
    const activeView = signal<ContactView>('all');
    const labels = computed(crmDataGridLabels);
    const rows = computed<ContactGridRow[]>(() =>
      crmData.value.contacts.map((contact) => ({
        ...contact,
        companyName:
          crmData.value.companies.find((company) => company.id === contact.companyId)?.name ?? t('common.unknown'),
        statusLabel: t(`contacts.${contact.status}`),
      })),
    );
    const views = computed<DataGridView<ContactGridRow>[]>(() => [
      { id: 'all', label: t('contacts.allContacts') },
      {
        filter: (contact) => contactAgeDays(contact) <= 14,
        id: 'recent',
        label: t('contacts.recentlyActive'),
      },
      {
        filter: (contact) => contactAgeDays(contact) >= 30,
        id: 'follow-up',
        label: t('contacts.needsFollowUp'),
      },
    ]);
    const columns = computed<DataGridColumn<ContactGridRow>[]>(() => [
      {
        cell: (contact) => contact.name,
        key: 'name',
        label: t('contacts.name'),
        renderCell: (contact) => html`
          <button
            part="contact-name"
            type="button"
            aria-label=${t('action.openRecord', {
              name: contact.name,
            })}
            @click=${() => openRecordDrawer('contact', contact.id)}>
            <span part="contact-avatar">${initials(contact.name)}</span>
            <strong part="contact-primary">${contact.name}</strong>
          </button>
        `,
        sortable: true,
        width: '14rem',
      },
      {
        cell: (contact) => contact.companyName,
        key: 'companyName',
        label: t('contacts.company'),
        renderCell: (contact) => html`
          <span part="contact-company">
            <company-mark name=${contact.companyName}></company-mark>
            <span>${contact.companyName}</span>
          </span>
        `,
        sortable: true,
        width: '12rem',
      },
      { key: 'title', label: t('contacts.title'), sortable: true, width: '12rem' },
      {
        cell: (contact) => contact.email,
        key: 'email',
        label: t('contacts.email'),
        renderCell: (contact) => html`
          <a part="contact-email" href=${`mailto:${contact.email}`}>${contact.email}</a>
        `,
        sortable: true,
        width: '15rem',
      },
      {
        cell: (contact) => contact.statusLabel,
        key: 'status',
        label: t('contacts.status'),
        renderCell: (contact) => html`
          <ore-badge color=${contact.status === 'active' ? 'success' : undefined}>${contact.statusLabel}</ore-badge>
        `,
        sortable: true,
        width: '8rem',
      },
      {
        cell: (contact) => formatRelativeDate(contact.lastContactAt),
        filterLabel: (contact) => formatDate(contact.lastContactAt, 'short'),
        filterValue: (contact) => dateFilterValue(contact.lastContactAt),
        key: 'lastContactAt',
        label: t('contacts.lastContact'),
        renderCell: (contact) => html`
          <time datetime=${contact.lastContactAt} title=${formatDate(contact.lastContactAt, 'short')}>
            ${formatRelativeDate(contact.lastContactAt)}
          </time>
        `,
        sortable: true,
        sortValue: (contact) => Date.parse(contact.lastContactAt),
        width: '10rem',
      },
    ]);
    const filterOptions = computed<FilterOption[]>(() => [
      {
        key: 'status',
        label: t('contacts.status'),
        operators: categoricalOperators(),
        options: [
          { label: t('contacts.active'), value: 'active' },
          { label: t('contacts.inactive'), value: 'inactive' },
        ],
      },
      {
        key: 'companyId',
        label: t('contacts.company'),
        operators: categoricalOperators(),
        options: crmData.value.companies.map((company) => ({ label: company.name, value: company.id })),
      },
    ]);

    return html`
      <header class="page-heading">
        <div>
          <h1>${() => t('nav.contacts')}</h1>
          <p>${() => t('contacts.peopleAndRelationships')}</p>
        </div>
        ${when(
          () => can('create'),
          () => html`
            <ore-button color="primary" @click=${() => openRecordDialog('contact')}>
              <ore-icon slot="prefix" name="plus" size="16"></ore-icon>
              ${() => t('action.newContact')}
            </ore-button>
          `,
        )}
      </header>
      <ore-datagrid
        class="crm-datagrid contacts-datagrid"
        density="compact"
        fullwidth
        active-view=${activeView}
        label=${() => t('nav.contacts')}
        columns=${columns}
        rows=${rows}
        views=${views}
        filterOptions=${filterOptions}
        labels=${labels}
        empty-text=${() => t('contacts.noContactsFound')}
        page-size="10"
        pageSizeOptions=${PAGE_SIZE_OPTIONS}
        search-placeholder=${() => t('contacts.searchContacts')}
        @view-change=${(event: CustomEvent<{ id: ContactView }>) => {
          activeView.value = event.detail.id;
        }}></ore-datagrid>
    `;
  },
  shadow: false,
});

export function createContactsView(): HTMLElement {
  return document.createElement('crm-contacts-view');
}
