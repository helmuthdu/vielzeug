import { beforeEach, describe, expect, it } from 'vitest';
import { ledger, moveOpportunity } from './history';
import {
  createCompany,
  createContact,
  createLead,
  createOpportunity,
  updateCompany,
  updateContact,
  updateLead,
  updateOpportunity,
} from './record-actions';
import { demoUsers, seedData } from './seed-data';
import { crmData, currentUser } from './store';

beforeEach(async () => {
  crmData.value = structuredClone(seedData);
  currentUser.value = demoUsers[0];
  await ledger.clear();
});

describe('record actions', () => {
  it('creates each CRM entity with related data', () => {
    const companyId = createCompany({
      city: 'Lisbon',
      country: 'Portugal',
      employees: 180,
      health: 'healthy',
      industry: 'Software',
      name: 'Northstar Labs',
      ownerId: 'alex',
      revenue: '900000',
      tier: 'growth',
      website: 'https://northstar.example',
    });
    expect(companyId).not.toBeNull();
    const contactId = createContact({
      companyId: companyId!,
      email: 'ada@northstar.example',
      name: 'Ada Stone',
      ownerId: 'alex',
      status: 'active',
      title: 'COO',
    });
    const leadId = createLead({
      companyId: companyId!,
      name: 'Jo Lin',
      ownerId: 'sarah',
      source: 'Inbound',
      status: 'new',
    });
    const opportunityId = createOpportunity({
      amount: '85000',
      companyId: companyId!,
      contactId: contactId!,
      expectedClose: '2026-11-10T00:00:00.000Z',
      name: 'Northstar Platform',
      ownerId: 'alex',
      probability: 55,
      stage: 'proposal',
    });
    expect(crmData.value.companies[0]).toMatchObject({
      city: 'Lisbon',
      health: 'healthy',
      id: companyId,
      tier: 'growth',
    });
    expect(crmData.value.contacts[0].id).toBe(contactId);
    expect(crmData.value.leads[0].id).toBe(leadId);
    expect(crmData.value.opportunities[0].id).toBe(opportunityId);
    expect(crmData.value.activities[1]).toMatchObject({
      category: 'system',
      companyId,
      kind: 'lead.created',
      leadId,
    });
  });

  it('updates each CRM entity', async () => {
    expect(updateCompany('company-1', { name: 'Acme Europe' })).toBe(true);
    expect(updateContact('contact-1', { title: 'Chief Revenue Officer' })).toBe(true);
    expect(updateLead('lead-1', { status: 'qualified' })).toBe(true);
    await expect(updateOpportunity('opportunity-1', { probability: 80 })).resolves.toBe(true);
    expect(crmData.value.companies[0].name).toBe('Acme Europe');
    expect(crmData.value.contacts[0].title).toBe('Chief Revenue Officer');
    expect(crmData.value.leads[0].status).toBe('qualified');
    expect(crmData.value.opportunities[0].probability).toBe(80);
  });

  it('records complete opportunity stage activity metadata', async () => {
    await expect(moveOpportunity('opportunity-1', 'negotiation')).resolves.toBe(true);
    expect(crmData.value.activities[0]).toMatchObject({
      category: 'system',
      companyId: 'company-1',
      kind: 'opportunity.stageChanged',
      opportunityId: 'opportunity-1',
    });
  });

  it('rejects viewer mutations', async () => {
    currentUser.value = demoUsers[2];
    expect(createCompany({ industry: 'Media', name: 'Blocked', ownerId: 'guest', revenue: '1' })).toBeNull();
    expect(updateContact('contact-1', { title: 'Blocked' })).toBe(false);
    await expect(updateOpportunity('opportunity-1', { probability: 1 })).resolves.toBe(false);
    await expect(moveOpportunity('opportunity-1', 'negotiation')).resolves.toBe(false);
  });
});
