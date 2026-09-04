import { can } from './auth';
import { bus } from './events';
import { editOpportunity } from './history';
import { crmData, currentUser, prependActivity } from './store';
import type { Activity, Company, Contact, Lead, Opportunity } from './types';

export type RecordKind = 'company' | 'contact' | 'lead' | 'opportunity';
type CompanyProfile = Pick<Company, 'city' | 'country' | 'employees' | 'health' | 'tier' | 'website'>;
export type CompanyInput = Omit<Company, 'id' | 'lastActivityAt' | keyof CompanyProfile> & Partial<CompanyProfile>;
export type ContactInput = Omit<Contact, 'id' | 'lastContactAt'>;
export type LeadInput = Omit<Lead, 'createdAt' | 'id'>;
export type OpportunityInput = Omit<Opportunity, 'id'>;

function permitted(action: 'create' | 'update'): boolean {
  if (can(action)) return true;
  bus.emit('toast:show', { message: `You do not have permission to ${action} CRM records.`, variant: 'error' });
  return false;
}

function activity(
  description: string,
  kind: Activity['kind'],
  relations: Pick<Activity, 'companyId' | 'contactId' | 'leadId' | 'opportunityId'> = {},
): void {
  prependActivity({
    actor: currentUser.value.name,
    category: 'system',
    createdAt: new Date().toISOString(),
    description,
    id: `activity-${crypto.randomUUID()}`,
    kind,
    ...relations,
  });
}

function success(message: string): void {
  bus.emit('toast:show', { message, variant: 'success' });
}

export function createCompany(input: CompanyInput): string | null {
  if (!permitted('create')) return null;
  const id = `company-${crypto.randomUUID()}`;
  crmData.value = {
    ...crmData.value,
    companies: [
      {
        city: 'Unknown',
        country: 'Unknown',
        employees: 0,
        health: 'watch',
        tier: 'standard',
        website: `https://${input.name.toLowerCase().replaceAll(' ', '-')}.example`,
        ...input,
        id,
        lastActivityAt: new Date().toISOString(),
      },
      ...crmData.value.companies,
    ],
  };
  activity(`created ${input.name}`, 'company.updated', { companyId: id });
  success('Company created.');
  return id;
}

export function updateCompany(id: string, patch: Partial<CompanyInput>): boolean {
  if (!permitted('update')) return false;
  const company = crmData.value.companies.find((item) => item.id === id);
  if (!company) return false;
  crmData.value = {
    ...crmData.value,
    companies: crmData.value.companies.map((item) =>
      item.id === id ? { ...item, ...patch, lastActivityAt: new Date().toISOString() } : item,
    ),
  };
  activity(`updated ${patch.name ?? company.name}`, 'company.updated', { companyId: id });
  success('Company updated.');
  return true;
}

export function createContact(input: ContactInput): string | null {
  if (!permitted('create')) return null;
  const id = `contact-${crypto.randomUUID()}`;
  crmData.value = {
    ...crmData.value,
    contacts: [{ ...input, id, lastContactAt: new Date().toISOString() }, ...crmData.value.contacts],
  };
  activity(`created contact ${input.name}`, 'contact.created', { companyId: input.companyId, contactId: id });
  success('Contact created.');
  return id;
}

export function updateContact(id: string, patch: Partial<ContactInput>): boolean {
  if (!permitted('update')) return false;
  const contact = crmData.value.contacts.find((item) => item.id === id);
  if (!contact) return false;
  crmData.value = {
    ...crmData.value,
    contacts: crmData.value.contacts.map((item) =>
      item.id === id ? { ...item, ...patch, lastContactAt: new Date().toISOString() } : item,
    ),
  };
  activity(`updated contact ${patch.name ?? contact.name}`, 'contact.updated', {
    companyId: patch.companyId ?? contact.companyId,
    contactId: id,
  });
  success('Contact updated.');
  return true;
}

export function createLead(input: LeadInput): string | null {
  if (!permitted('create')) return null;
  const id = `lead-${crypto.randomUUID()}`;
  crmData.value = {
    ...crmData.value,
    leads: [{ ...input, createdAt: new Date().toISOString(), id }, ...crmData.value.leads],
  };
  activity(`created lead ${input.name}`, 'lead.created', { companyId: input.companyId, leadId: id });
  success('Lead created.');
  return id;
}

export function updateLead(id: string, patch: Partial<LeadInput>): boolean {
  if (!permitted('update')) return false;
  const lead = crmData.value.leads.find((item) => item.id === id);
  if (!lead) return false;
  crmData.value = {
    ...crmData.value,
    leads: crmData.value.leads.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
  activity(`updated lead ${patch.name ?? lead.name}`, 'lead.updated', {
    companyId: patch.companyId ?? lead.companyId,
    leadId: id,
  });
  success('Lead updated.');
  return true;
}

export function createOpportunity(input: OpportunityInput): string | null {
  if (!permitted('create')) return null;
  const id = `opportunity-${crypto.randomUUID()}`;
  crmData.value = { ...crmData.value, opportunities: [{ ...input, id }, ...crmData.value.opportunities] };
  activity(`created opportunity ${input.name}`, 'opportunity.updated', {
    companyId: input.companyId,
    opportunityId: id,
  });
  success('Opportunity created.');
  return id;
}

export async function updateOpportunity(id: string, patch: Partial<OpportunityInput>): Promise<boolean> {
  if (!permitted('update')) return false;
  const opportunity = crmData.value.opportunities.find((item) => item.id === id);
  if (!opportunity) return false;
  const updated = await editOpportunity(id, patch);
  if (updated)
    activity(`updated opportunity ${patch.name ?? opportunity.name}`, 'opportunity.updated', {
      companyId: patch.companyId ?? opportunity.companyId,
      opportunityId: id,
    });
  return updated;
}
