import { describe, expect, it } from 'vitest';
import { seedData } from './seed-data';
import {
  activityBuckets,
  companyActivities,
  companyById,
  companyContacts,
  companyLeads,
  companyOpportunities,
  conversion,
  leadsNeedingAttention,
  openPipeline,
  opportunitiesNeedingAttention,
  ownerById,
  sourcePerformance,
  stageTotals,
  weightedPipeline,
  wonValue,
} from './selectors';
import type { Activity, CrmData, Lead, Opportunity } from './types';

const opportunities: Opportunity[] = [
  {
    amount: '100',
    companyId: 'company-1',
    contactId: 'contact-1',
    expectedClose: '2026-09-10T12:00:00.000Z',
    id: 'open-soon',
    name: 'Open soon',
    ownerId: 'alex',
    probability: 50,
    stage: 'proposal',
  },
  {
    amount: '200',
    companyId: 'company-1',
    contactId: 'contact-1',
    expectedClose: '2026-09-20T12:00:00.000Z',
    id: 'open-later',
    name: 'Open later',
    ownerId: 'alex',
    probability: 25,
    stage: 'qualification',
  },
  {
    amount: '300',
    companyId: 'company-1',
    contactId: 'contact-1',
    expectedClose: '2026-08-01T12:00:00.000Z',
    id: 'won',
    name: 'Won',
    ownerId: 'alex',
    probability: 100,
    stage: 'closed-won',
  },
];
const leads: Lead[] = [
  {
    companyId: 'company-1',
    createdAt: '2026-08-01T10:00:00.000Z',
    id: 'old-new',
    name: 'Old new lead',
    ownerId: 'alex',
    source: 'Referral',
    status: 'new',
  },
  {
    companyId: 'company-1',
    createdAt: '2026-08-25T10:00:00.000Z',
    id: 'recent-working',
    name: 'Recent working lead',
    ownerId: 'sarah',
    source: 'Inbound',
    status: 'working',
  },
  {
    companyId: 'company-2',
    createdAt: '2026-07-01T10:00:00.000Z',
    id: 'qualified',
    name: 'Qualified lead',
    ownerId: 'alex',
    source: 'Referral',
    status: 'qualified',
  },
];
const activities: Activity[] = [
  {
    actor: 'Alex Morgan',
    category: 'call',
    companyId: 'company-1',
    createdAt: '2026-08-31T09:00:00.000Z',
    description: 'called customer',
    id: 'activity-a',
    kind: 'company.updated',
  },
  {
    actor: 'Sarah Chen',
    category: 'email',
    companyId: 'company-1',
    createdAt: '2026-08-31T15:00:00.000Z',
    description: 'emailed customer',
    id: 'activity-b',
    kind: 'company.updated',
  },
  {
    actor: 'Alex Morgan',
    category: 'meeting',
    companyId: 'company-2',
    createdAt: '2026-08-30T09:00:00.000Z',
    description: 'met customer',
    id: 'activity-c',
    kind: 'company.updated',
  },
  {
    actor: 'Alex Morgan',
    category: 'note',
    companyId: 'company-1',
    createdAt: '2026-06-08T09:00:00.000Z',
    description: 'old note',
    id: 'activity-old',
    kind: 'company.updated',
  },
];
const data: CrmData = { ...structuredClone(seedData), activities, leads, opportunities };

describe('CRM selectors', () => {
  it('resolves owners, companies, and company relationships', () => {
    expect(ownerById('alex')?.name).toBe('Alex Morgan');
    expect(ownerById('missing')).toBeUndefined();
    expect(companyById(data, 'company-1')?.name).toBe('Acme Corporation');
    expect(companyContacts(data, 'company-1').every((contact) => contact.companyId === 'company-1')).toBe(true);
    expect(companyLeads(data, 'company-1').map((lead) => lead.id)).toEqual(['old-new', 'recent-working']);
    expect(companyOpportunities(data, 'company-1')).toHaveLength(3);
    expect(companyActivities(data, 'company-1')).toHaveLength(3);
  });

  it('calculates pipeline and conversion metrics', () => {
    expect(openPipeline(data)).toBe(300);
    expect(weightedPipeline(data)).toBe(100);
    expect(wonValue(data)).toBe(300);
    expect(conversion(data)).toBeCloseTo(100 / 3);
  });

  it('finds leads and opportunities needing attention', () => {
    const asOf = '2026-08-31T12:00:00.000Z';
    expect(leadsNeedingAttention(data, asOf).map((lead) => lead.id)).toEqual(['old-new']);
    expect(opportunitiesNeedingAttention(data, asOf).map((opportunity) => opportunity.id)).toEqual(['open-soon']);
  });

  it('summarizes stages and source performance', () => {
    expect(stageTotals(data).find((total) => total.stage === 'proposal')).toEqual({
      count: 1,
      stage: 'proposal',
      value: 100,
    });
    expect(stageTotals(data).find((total) => total.stage === 'closed-lost')).toEqual({
      count: 0,
      stage: 'closed-lost',
      value: 0,
    });
    expect(sourcePerformance(data).find((performance) => performance.source === 'Referral')).toEqual({
      conversion: 50,
      qualified: 1,
      source: 'Referral',
      total: 2,
    });
  });

  it('builds 84 complete UTC activity-day buckets', () => {
    const buckets = activityBuckets(data, '2026-08-31T12:00:00.000Z');
    expect(buckets).toHaveLength(84);
    expect(buckets[0]).toEqual({ count: 0, date: '2026-06-09' });
    expect(buckets.at(-2)).toEqual({ count: 1, date: '2026-08-30' });
    expect(buckets.at(-1)).toEqual({ count: 2, date: '2026-08-31' });
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(3);
  });
});
