import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import { createForm } from '@vielzeug/forge';
import { define, html, onCleanup, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { s } from '@vielzeug/spell';
import { can } from '../../core/auth';
import { t } from '../../core/i18n';
import {
  createCompany,
  createContact,
  createLead,
  createOpportunity,
  type RecordKind,
  updateCompany,
  updateContact,
  updateLead,
  updateOpportunity,
} from '../../core/record-actions';
import { crmData, currentUser } from '../../core/store';
import type { OpportunityStage } from '../../core/types';

interface RecordDialogRequest {
  companyId?: string;
  id?: string;
  kind: RecordKind;
}

type RecordDraft = Record<string, unknown> & {
  amount: string;
  city: string;
  companyId: string;
  country: string;
  employees: string;
  health: 'healthy' | 'risk' | 'watch';
  contactId: string;
  email: string;
  expectedClose: string;
  industry: string;
  name: string;
  ownerId: string;
  probability: string;
  revenue: string;
  source: 'Event' | 'Inbound' | 'Outbound' | 'Referral';
  stage: OpportunityStage;
  status: string;
  tier: 'growth' | 'standard' | 'strategic';
  title: string;
  website: string;
};

const request = signal<RecordDialogRequest | null>(null);
const requiredName = s.object({ name: s.string().trim().min(1) });
const companySchema = s.object({ name: s.string().trim().min(1), revenue: s.number().min(0) });
const contactSchema = s.object({
  email: s.string().trim().email(),
  name: s.string().trim().min(1),
  title: s.string().trim().min(1),
});
const opportunitySchema = s.object({
  amount: s.number().min(1),
  name: s.string().trim().min(1),
  probability: s.number().min(0).max(100),
});

function emptyDraft(): RecordDraft {
  return {
    amount: '50000',
    city: 'Berlin',
    companyId: 'company-1',
    contactId: 'contact-1',
    country: 'Germany',
    email: '',
    employees: '250',
    expectedClose: new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10),
    health: 'healthy',
    industry: 'Software',
    name: '',
    ownerId: currentUser.value.id,
    probability: '35',
    revenue: '500000',
    source: 'Inbound',
    stage: 'prospecting',
    status: 'active',
    tier: 'growth',
    title: '',
    website: 'example.com',
  };
}

export function openRecordDialog(kind: RecordKind, id?: string, companyId?: string): boolean {
  if (!can(id ? 'update' : 'create')) return false;

  request.value = { companyId, id, kind };
  return true;
}

function eventValue(event: Event): string {
  const detail = (event as CustomEvent<{ value?: string; values?: string[] }>).detail;
  return detail?.value ?? detail?.values?.[0] ?? (event.target as HTMLInputElement).value ?? '';
}

function recordKindLabel(kind: RecordKind | undefined): string {
  if (kind === 'company') return t('companies.company');
  if (kind === 'contact') return t('recordDialog.contact');
  if (kind === 'lead') return t('leads.lead');
  if (kind === 'opportunity') return t('opportunities.opportunity');
  return t('recordDrawer.recordDetails');
}

define('crm-record-dialog', {
  setup() {
    const form = createForm<RecordDraft>({ initialValues: emptyDraft() });
    const errors = signal<Record<string, string>>({});
    const errorMessage = (field: keyof RecordDraft): string => {
      const key = errors.value[field];
      return key ? t(key) : '';
    };
    const isEdit = computed(() => Boolean(request.value?.id));
    const title = computed(() =>
      t(isEdit.value ? 'recordDialog.editRecord' : 'recordDialog.createRecord', {
        kind: recordKindLabel(request.value?.kind),
      }),
    );
    const companyOptions = computed(() =>
      crmData.value.companies.map((item) => ({ label: item.name, value: item.id })),
    );
    const contactOptions = computed(() =>
      crmData.value.contacts
        .filter((item) => item.companyId === form.value.companyId)
        .map((item) => ({ label: item.name, value: item.id })),
    );
    const industryOptions = computed(() =>
      [
        ['recordDialog.software', 'Software'],
        ['recordDialog.manufacturing', 'Manufacturing'],
        ['recordDialog.financialServices', 'Financial Services'],
        ['recordDialog.healthcare', 'Healthcare'],
        ['recordDialog.logistics', 'Logistics'],
        ['recordDialog.energy', 'Energy'],
        ['recordDialog.media', 'Media'],
      ].map(([key, value]) => ({ label: t(key), value })),
    );
    const healthOptions = computed(() =>
      [
        ['companies.healthy', 'healthy'],
        ['recordDialog.watch', 'watch'],
        ['companies.atRisk', 'risk'],
      ].map(([key, value]) => ({ label: t(key), value })),
    );
    const tierOptions = computed(() =>
      [
        ['recordDialog.strategic', 'strategic'],
        ['recordDialog.growth', 'growth'],
        ['recordDialog.standard', 'standard'],
      ].map(([key, value]) => ({ label: t(key), value })),
    );
    const contactStatusOptions = computed(() => [
      { label: t('contacts.active'), value: 'active' },
      { label: t('contacts.inactive'), value: 'inactive' },
    ]);
    const sourceOptions = computed(() =>
      [
        ['recordDialog.inbound', 'Inbound'],
        ['recordDialog.outbound', 'Outbound'],
        ['recordDialog.referral', 'Referral'],
        ['recordDialog.event', 'Event'],
      ].map(([key, value]) => ({ label: t(key), value })),
    );
    const leadStatusOptions = computed(() => [
      { label: t('leads.new'), value: 'new' },
      { label: t('leads.working'), value: 'working' },
      { label: t('leads.qualified'), value: 'qualified' },
    ]);
    const stageOptions = computed(() =>
      [
        ['pipeline.prospecting', 'prospecting'],
        ['pipeline.qualification', 'qualification'],
        ['pipeline.proposal', 'proposal'],
        ['pipeline.negotiation', 'negotiation'],
        ['pipeline.closedWon', 'closed-won'],
        ['pipeline.closedLost', 'closed-lost'],
      ].map(([key, value]) => ({ label: t(key), value })),
    );
    const ownerOptions = computed(() => [
      { label: t('common.alexMorgan'), value: 'alex' },
      { label: t('common.sarahChen'), value: 'sarah' },
    ]);
    const patch =
      (field: keyof RecordDraft) =>
      (event: Event): void => {
        const value = eventValue(event);
        form.field(field).set(value as never);
        if (field === 'companyId' && request.value?.kind === 'opportunity') {
          const firstContact = crmData.value.contacts.find((item) => item.companyId === value);
          form.field('contactId').set(firstContact?.id ?? '');
        }
        if (errors.value[field]) errors.value = { ...errors.value, [field]: '' };
      };

    effect(() => {
      const next = request.value;
      if (!next) return;
      const draft = emptyDraft();
      if (next.companyId) {
        draft.companyId = next.companyId;
        draft.contactId = crmData.value.contacts.find((item) => item.companyId === next.companyId)?.id ?? '';
      }
      if (next.id && next.kind === 'company') {
        const item = crmData.value.companies.find((candidate) => candidate.id === next.id);
        if (item) Object.assign(draft, item);
      } else if (next.id && next.kind === 'contact') {
        const item = crmData.value.contacts.find((candidate) => candidate.id === next.id);
        if (item) Object.assign(draft, item);
      } else if (next.id && next.kind === 'lead') {
        const item = crmData.value.leads.find((candidate) => candidate.id === next.id);
        if (item) Object.assign(draft, item);
      } else if (next.id && next.kind === 'opportunity') {
        const item = crmData.value.opportunities.find((candidate) => candidate.id === next.id);
        if (item) Object.assign(draft, item, { expectedClose: item.expectedClose.slice(0, 10) });
      }
      errors.value = {};
      form.reset(draft);
    });

    const validate = (kind: RecordKind): boolean => {
      const nextErrors: Record<string, string> = {};
      if (!requiredName.safeParse({ name: form.value.name }).success) nextErrors.name = 'recordDialog.enterName';
      if (kind === 'company') {
        const result = companySchema.safeParse({ name: form.value.name, revenue: Number(form.value.revenue) });
        if (!result.success && !(Number(form.value.revenue) >= 0)) nextErrors.revenue = 'recordDialog.enterRevenue';
      }
      if (kind === 'contact') {
        const result = contactSchema.safeParse({
          email: form.value.email,
          name: form.value.name,
          title: form.value.title,
        });
        if (!result.success) {
          if (!form.value.email.includes('@')) nextErrors.email = 'recordDialog.enterValidEmail';
          if (!form.value.title.trim()) nextErrors.title = 'recordDialog.enterJobTitle';
        }
      }
      if (kind === 'opportunity') {
        const result = opportunitySchema.safeParse({
          amount: Number(form.value.amount),
          name: form.value.name,
          probability: Number(form.value.probability),
        });
        if (!result.success) {
          if (!(Number(form.value.amount) > 0)) nextErrors.amount = 'recordDialog.enterAmountGreater';
          if (!(Number(form.value.probability) >= 0 && Number(form.value.probability) <= 100))
            nextErrors.probability = 'recordDialog.useProbability';
        }
        if (!form.value.expectedClose || Number.isNaN(Date.parse(`${form.value.expectedClose}T12:00:00Z`)))
          nextErrors.expectedClose = 'recordDialog.chooseValidDate';
      }
      errors.value = nextErrors;
      return Object.keys(nextErrors).length === 0;
    };

    const save = async (): Promise<void> => {
      const current = request.value;
      if (!current || !validate(current.kind)) return;
      let saved = false;
      if (current.kind === 'company') {
        const input = {
          city: form.value.city,
          country: form.value.country,
          employees: Number(form.value.employees),
          health: form.value.health,
          industry: form.value.industry,
          name: form.value.name.trim(),
          ownerId: form.value.ownerId,
          revenue: form.value.revenue,
          tier: form.value.tier,
          website: form.value.website,
        };
        saved = current.id ? updateCompany(current.id, input) : Boolean(createCompany(input));
      } else if (current.kind === 'contact') {
        const input = {
          companyId: form.value.companyId,
          email: form.value.email.trim(),
          name: form.value.name.trim(),
          ownerId: form.value.ownerId,
          status: form.value.status as 'active' | 'inactive',
          title: form.value.title.trim(),
        };
        saved = current.id ? updateContact(current.id, input) : Boolean(createContact(input));
      } else if (current.kind === 'lead') {
        const input = {
          companyId: form.value.companyId,
          name: form.value.name.trim(),
          ownerId: form.value.ownerId,
          source: form.value.source,
          status: form.value.status as 'new' | 'qualified' | 'working',
        };
        saved = current.id ? updateLead(current.id, input) : Boolean(createLead(input));
      } else {
        const input = {
          amount: form.value.amount,
          companyId: form.value.companyId,
          contactId: form.value.contactId,
          expectedClose: new Date(`${form.value.expectedClose}T12:00:00Z`).toISOString(),
          name: form.value.name.trim(),
          ownerId: form.value.ownerId,
          probability: Number(form.value.probability),
          stage: form.value.stage,
        };
        saved = current.id ? await updateOpportunity(current.id, input) : Boolean(createOpportunity(input));
      }
      if (saved) request.value = null;
    };

    onCleanup(() => form.dispose());
    return html`
      <ore-dialog
        label=${title}
        ?open=${() => request.value !== null}
        @close=${(event: Event) => {
          if (event.target === event.currentTarget) request.value = null;
        }}>
        <form
          class="record-form"
          @submit=${(event: Event) => {
            event.preventDefault();
            void save();
          }}>
          <ore-input
            label=${() => t('recordDialog.name')}
            required
            value=${() => form.value.name}
            error=${() => errorMessage('name')}
            @input=${patch('name')}></ore-input>
          ${when(
            () => request.value?.kind === 'company',
            () => html`
              <ore-select
                label=${() => t('recordDialog.industry')}
                options=${industryOptions}
                value=${() => form.value.industry}
                @change=${patch('industry')}></ore-select>
              <div class="form-row">
                <ore-input
                  label=${() => t('recordDialog.annualRevenueEur')}
                  type="number"
                  min="0"
                  value=${() => form.value.revenue}
                  error=${() => errorMessage('revenue')}
                  @input=${patch('revenue')}></ore-input>
                <ore-input
                  label=${() => t('recordDialog.employees')}
                  type="number"
                  min="1"
                  value=${() => form.value.employees}
                  @input=${patch('employees')}></ore-input>
              </div>
              <div class="form-row">
                <ore-input
                  label=${() => t('recordDialog.city')}
                  value=${() => form.value.city}
                  @input=${patch('city')}></ore-input>
                <ore-input
                  label=${() => t('recordDialog.country')}
                  value=${() => form.value.country}
                  @input=${patch('country')}></ore-input>
              </div>
              <ore-input
                label=${() => t('recordDialog.website')}
                value=${() => form.value.website}
                @input=${patch('website')}></ore-input>
              <div class="form-row">
                <ore-select
                  label=${() => t('recordDialog.health')}
                  options=${healthOptions}
                  value=${() => form.value.health}
                  @change=${patch('health')}></ore-select>
                <ore-select
                  label=${() => t('recordDialog.tier')}
                  options=${tierOptions}
                  value=${() => form.value.tier}
                  @change=${patch('tier')}></ore-select>
              </div>
            `,
          )}
          ${when(
            () => request.value?.kind !== 'company',
            () => html`
              <ore-select
                label=${() => t('recordDialog.company')}
                options=${companyOptions}
                value=${() => form.value.companyId}
                @change=${patch('companyId')}></ore-select>
            `,
          )}
          ${when(
            () => request.value?.kind === 'contact',
            () => html`
              <ore-input
                label=${() => t('recordDialog.jobTitle')}
                value=${() => form.value.title}
                error=${() => errorMessage('title')}
                @input=${patch('title')}></ore-input>
              <ore-input
                label=${() => t('recordDialog.email')}
                type="email"
                value=${() => form.value.email}
                error=${() => errorMessage('email')}
                @input=${patch('email')}></ore-input>
              <ore-select
                label=${() => t('recordDialog.status')}
                options=${contactStatusOptions}
                value=${() => form.value.status}
                @change=${patch('status')}></ore-select>
            `,
          )}
          ${when(
            () => request.value?.kind === 'lead',
            () => html`
              <ore-select
                label=${() => t('recordDialog.source')}
                options=${sourceOptions}
                value=${() => form.value.source}
                @change=${patch('source')}></ore-select>
              <ore-select
                label=${() => t('recordDialog.status')}
                options=${leadStatusOptions}
                value=${() => form.value.status}
                @change=${patch('status')}></ore-select>
            `,
          )}
          ${when(
            () => request.value?.kind === 'opportunity',
            () => html`
              <ore-select
                label=${() => t('recordDialog.contact')}
                options=${contactOptions}
                value=${() => form.value.contactId}
                @change=${patch('contactId')}></ore-select>
              <div class="form-row">
                <ore-input
                  label=${() => t('recordDialog.amountEur')}
                  type="number"
                  min="1"
                  value=${() => form.value.amount}
                  error=${() => errorMessage('amount')}
                  @input=${patch('amount')}></ore-input>
                <ore-input
                  label=${() => t('recordDialog.probabilityPct')}
                  type="number"
                  min="0"
                  max="100"
                  value=${() => form.value.probability}
                  error=${() => errorMessage('probability')}
                  @input=${patch('probability')}></ore-input>
              </div>
              <div class="form-row">
                <ore-select
                  label=${() => t('recordDialog.stage')}
                  options=${stageOptions}
                  value=${() => form.value.stage}
                  @change=${patch('stage')}></ore-select>
                <ore-input
                  label=${() => t('recordDialog.expectedClose')}
                  type="date"
                  value=${() => form.value.expectedClose}
                  error=${() => errorMessage('expectedClose')}
                  @input=${patch('expectedClose')}></ore-input>
              </div>
            `,
          )}
          <ore-select
            label=${() => t('recordDialog.owner')}
            options=${ownerOptions}
            value=${() => form.value.ownerId}
            @change=${patch('ownerId')}></ore-select>
          <div class="dialog-actions">
            <ore-button
              variant="ghost"
              type="button"
              @click=${() => {
                request.value = null;
              }}>
              ${() => t('recordDialog.cancel')}
            </ore-button>
            <ore-button color="primary" type="submit">
              ${() => (isEdit.value ? t('recordDialog.saveChanges') : title.value)}
            </ore-button>
          </div>
        </form>
      </ore-dialog>
    `;
  },
  shadow: false,
});
