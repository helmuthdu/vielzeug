import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';
import type {
  Activity,
  ActivityCategory,
  Company,
  Contact,
  CrmData,
  DemoUser,
  Lead,
  Opportunity,
  OpportunityStage,
} from './types';

export const demoUsers: DemoUser[] = [
  { id: 'alex', name: 'Alex Morgan', role: 'manager', title: 'Sales Manager' },
  { id: 'sarah', name: 'Sarah Chen', role: 'sales', title: 'Sales Representative' },
  { id: 'guest', name: 'Guest', role: 'viewer', title: 'Viewer' },
];

const industries = ['Software', 'Manufacturing', 'Financial Services', 'Healthcare', 'Logistics', 'Energy', 'Media'];
const stages: OpportunityStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
];
const companyRoots = [
  'Acme',
  'Globex',
  'Initech',
  'Umbrella',
  'Stark',
  'Wayne',
  'Hooli',
  'Vandelay',
  'Massive Dynamic',
  'Wonka',
];
const companySuffixes = ['Systems', 'Group', 'Industries', 'Labs', 'Partners', 'Works'];
const locations = [
  ['Berlin', 'Germany'],
  ['Amsterdam', 'Netherlands'],
  ['London', 'United Kingdom'],
  ['Paris', 'France'],
  ['Madrid', 'Spain'],
  ['Stockholm', 'Sweden'],
  ['Dublin', 'Ireland'],
] as const;
const activityCategories: ActivityCategory[] = ['call', 'email', 'meeting', 'note', 'task', 'system'];
const titles = [
  'VP Sales',
  'Head of Operations',
  'Finance Director',
  'Procurement Lead',
  'Chief Technology Officer',
  'Revenue Operations Manager',
];

function isoDaysAgo(days: number, hour = 10): string {
  const date = new Date(Date.UTC(2026, 7, 31 - days, hour));
  return date.toISOString();
}

export function generateDemoData(seed: string | number = 'vielzeug-crm-2026'): CrmData {
  const illusion = createIllusion({ locale: en, seed });
  const companies: Company[] = Array.from({ length: 50 }, (_, index) => {
    const name =
      index === 0
        ? 'Acme Corporation'
        : `${companyRoots[index % companyRoots.length]} ${companySuffixes[Math.floor(index / companyRoots.length) % companySuffixes.length]}`;
    const [city, country] = locations[index % locations.length];
    return {
      city,
      country,
      employees: 25 + ((index * 83) % 4_900),
      health: (['healthy', 'watch', 'risk'] as const)[index % 3],
      id: `company-${index + 1}`,
      industry: industries[index % industries.length],
      lastActivityAt: isoDaysAgo(index % 45, 9 + (index % 7)),
      name,
      ownerId: index % 3 === 0 ? 'sarah' : 'alex',
      revenue: String(250000 + ((index * 137000) % 4750000)),
      tier: (['strategic', 'growth', 'standard'] as const)[index % 3],
      website: `https://${name.toLowerCase().replaceAll(' ', '-')}.example`,
    };
  });
  const contacts: Contact[] = Array.from({ length: 150 }, (_, index) => {
    const company = companies[index % companies.length];
    const name = index === 0 ? 'John Smith' : illusion.person.fullName();
    return {
      companyId: company.id,
      email: index === 0 ? 'john.smith@acme.example' : illusion.internet.email(),
      id: `contact-${index + 1}`,
      lastContactAt: isoDaysAgo(index % 60, 8 + (index % 8)),
      name,
      ownerId: company.ownerId,
      status: index % 11 === 0 ? 'inactive' : 'active',
      title: titles[index % titles.length],
    };
  });
  const opportunities: Opportunity[] = Array.from({ length: 40 }, (_, index) => {
    const company = companies[index % companies.length];
    const stage = stages[index % stages.length];
    return {
      amount: String(index === 0 ? 120000 : 18000 + ((index * 19300) % 220000)),
      companyId: company.id,
      contactId: contacts[index % contacts.length].id,
      expectedClose: isoDaysAgo(-(14 + (index % 100)), 12),
      id: `opportunity-${index + 1}`,
      name:
        index === 0
          ? 'Acme Enterprise Contract'
          : `${company.name} ${['Expansion', 'Platform', 'Renewal', 'Transformation'][index % 4]}`,
      ownerId: company.ownerId,
      probability: [20, 35, 55, 70, 100, 0][index % 6],
      stage,
    };
  });
  opportunities[0].stage = 'proposal';
  opportunities[0].probability = 70;
  const leads: Lead[] = Array.from({ length: 30 }, (_, index) => ({
    companyId: companies[(index * 3) % companies.length].id,
    createdAt: isoDaysAgo(index % 35),
    id: `lead-${index + 1}`,
    name: illusion.person.fullName(),
    ownerId: index % 2 === 0 ? 'sarah' : 'alex',
    source: (['Referral', 'Inbound', 'Event', 'Outbound'] as const)[index % 4],
    status: (['new', 'working', 'qualified'] as const)[index % 3],
  }));
  const activities: Activity[] = Array.from({ length: 200 }, (_, index) => {
    const opportunity = opportunities[index % opportunities.length];
    const company = companies[index % companies.length];
    const contact = contacts[index % contacts.length];
    const lead = leads[index % leads.length];
    const kind = (['opportunity.stageChanged', 'company.updated', 'contact.created', 'lead.updated'] as const)[
      index % 4
    ];
    const companyId =
      kind === 'opportunity.stageChanged'
        ? opportunity.companyId
        : kind === 'contact.created'
          ? contact.companyId
          : kind === 'lead.updated'
            ? lead.companyId
            : company.id;
    return {
      actor: demoUsers[index % 2].name,
      category: activityCategories[index % activityCategories.length],
      companyId,
      contactId: kind === 'contact.created' ? contact.id : undefined,
      createdAt: isoDaysAgo(index % 90, 8 + (index % 10)),
      description:
        kind === 'opportunity.stageChanged'
          ? `moved ${opportunity.name} to ${opportunity.stage.replace('-', ' ')}`
          : kind === 'company.updated'
            ? `updated ${company.name}`
            : kind === 'contact.created'
              ? `added a contact at ${company.name}`
              : `updated lead ${lead.name}`,
      id: `activity-${index + 1}`,
      kind,
      leadId: kind === 'lead.updated' ? lead.id : undefined,
      opportunityId: kind === 'opportunity.stageChanged' ? opportunity.id : undefined,
    };
  });
  return { activities, companies, contacts, leads, opportunities };
}

export const seedData = generateDemoData();
