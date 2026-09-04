import { describe, expect, it, vi } from 'vitest';
import { generateDemoData } from './seed-data';

describe('demo data', () => {
  it('is deterministic for a fixed seed', () => {
    expect(generateDemoData('fixed')).toEqual(generateDemoData('fixed'));
  });

  it('normalizes legacy data without replacing stored records', async () => {
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false }));
    const { CRM_DATA_VERSION, normalizeCrmData } = await import('./persistence');
    const legacy = structuredClone(generateDemoData());
    const company = legacy.companies[0] as unknown as Record<string, unknown>;
    const activity = legacy.activities[0] as unknown as Record<string, unknown>;
    delete company.city;
    delete company.country;
    delete company.employees;
    delete company.health;
    delete company.tier;
    delete company.website;
    delete activity.category;

    const normalized = normalizeCrmData(legacy);
    expect(CRM_DATA_VERSION).toBeGreaterThan(1);
    expect(normalized.companies[0]).toMatchObject({
      city: 'Berlin',
      health: 'healthy',
      id: 'company-1',
      name: 'Acme Corporation',
      tier: 'strategic',
    });
    expect(normalized.activities[0]).toMatchObject({ category: 'system', companyId: 'company-1' });
  });

  it('provides the five-minute demo records', () => {
    const data = generateDemoData();
    expect(data.companies).toHaveLength(50);
    expect(data.contacts).toHaveLength(150);
    expect(data.leads).toHaveLength(30);
    expect(data.opportunities).toHaveLength(40);
    expect(data.activities).toHaveLength(200);
    expect(data.companies[0]).toMatchObject({
      city: 'Berlin',
      country: 'Germany',
      employees: 25,
      health: 'healthy',
      tier: 'strategic',
      website: 'https://acme-corporation.example',
    });
    expect(data.opportunities[0]).toMatchObject({
      amount: '120000',
      name: 'Acme Enterprise Contract',
      probability: 70,
      stage: 'proposal',
    });
    expect(data.activities.every((activity) => activity.category && activity.companyId)).toBe(true);
    expect(data.activities.some((activity) => activity.leadId)).toBe(true);
  });
});
