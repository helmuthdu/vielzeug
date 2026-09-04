import { demoUsers } from './seed-data';
import type { Activity, CrmData, DemoUser, Lead, LeadSource, Opportunity, OpportunityStage } from './types';

const DAY_MS = 86_400_000;
const opportunityStages: OpportunityStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
];
const leadSources: LeadSource[] = ['Referral', 'Inbound', 'Event', 'Outbound'];
const closedStages = new Set<OpportunityStage>(['closed-won', 'closed-lost']);

export interface StageTotal {
  count: number;
  stage: OpportunityStage;
  value: number;
}

export interface SourcePerformance {
  conversion: number;
  qualified: number;
  source: LeadSource;
  total: number;
}

export interface ActivityBucket {
  count: number;
  date: string;
}

function amount(opportunity: Opportunity): number {
  const value = Number(opportunity.amount);
  return Number.isFinite(value) ? value : 0;
}

function timestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

export function ownerById(ownerId: string): DemoUser | undefined {
  return demoUsers.find((owner) => owner.id === ownerId);
}

export function companyById(data: CrmData, companyId: string) {
  return data.companies.find((company) => company.id === companyId);
}

export function companyContacts(data: CrmData, companyId: string) {
  return data.contacts.filter((contact) => contact.companyId === companyId);
}

export function companyLeads(data: CrmData, companyId: string) {
  return data.leads.filter((lead) => lead.companyId === companyId);
}

export function companyOpportunities(data: CrmData, companyId: string) {
  return data.opportunities.filter((opportunity) => opportunity.companyId === companyId);
}

export function companyActivities(data: CrmData, companyId: string): Activity[] {
  return data.activities.filter((activity) => activity.companyId === companyId);
}

export function openPipeline(data: CrmData): number {
  return data.opportunities
    .filter((opportunity) => !closedStages.has(opportunity.stage))
    .reduce((total, opportunity) => total + amount(opportunity), 0);
}

export function weightedPipeline(data: CrmData): number {
  return data.opportunities
    .filter((opportunity) => !closedStages.has(opportunity.stage))
    .reduce((total, opportunity) => total + amount(opportunity) * (opportunity.probability / 100), 0);
}

export function wonValue(data: CrmData): number {
  return data.opportunities
    .filter((opportunity) => opportunity.stage === 'closed-won')
    .reduce((total, opportunity) => total + amount(opportunity), 0);
}

export function conversion(data: CrmData): number {
  return percentage(data.leads.filter((lead) => lead.status === 'qualified').length, data.leads.length);
}

export function leadsNeedingAttention(data: CrmData, asOf: Date | string = new Date(), ageDays = 14): Lead[] {
  const cutoff = timestamp(asOf) - ageDays * DAY_MS;
  return data.leads
    .filter((lead) => lead.status !== 'qualified' && timestamp(lead.createdAt) <= cutoff)
    .toSorted((left, right) => timestamp(left.createdAt) - timestamp(right.createdAt));
}

export function opportunitiesNeedingAttention(
  data: CrmData,
  asOf: Date | string = new Date(),
  horizonDays = 14,
): Opportunity[] {
  const cutoff = timestamp(asOf) + horizonDays * DAY_MS;
  return data.opportunities
    .filter((opportunity) => !closedStages.has(opportunity.stage) && timestamp(opportunity.expectedClose) <= cutoff)
    .toSorted((left, right) => timestamp(left.expectedClose) - timestamp(right.expectedClose));
}

export function stageTotals(data: CrmData): StageTotal[] {
  return opportunityStages.map((stage) => {
    const opportunities = data.opportunities.filter((opportunity) => opportunity.stage === stage);
    return {
      count: opportunities.length,
      stage,
      value: opportunities.reduce((total, opportunity) => total + amount(opportunity), 0),
    };
  });
}

export function sourcePerformance(data: CrmData): SourcePerformance[] {
  return leadSources.map((source) => {
    const leads = data.leads.filter((lead) => lead.source === source);
    const qualified = leads.filter((lead) => lead.status === 'qualified').length;
    return { conversion: percentage(qualified, leads.length), qualified, source, total: leads.length };
  });
}

export function activityBuckets(data: CrmData, asOf: Date | string = new Date(), days = 84): ActivityBucket[] {
  const end = new Date(timestamp(asOf));
  end.setUTCHours(0, 0, 0, 0);
  const start = end.getTime() - (days - 1) * DAY_MS;
  const counts = new Map<string, number>();
  for (const activity of data.activities) {
    const time = timestamp(activity.createdAt);
    if (time < start || time >= end.getTime() + DAY_MS) continue;
    const date = new Date(time).toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start + index * DAY_MS).toISOString().slice(0, 10);
    return { count: counts.get(date) ?? 0, date };
  });
}

export const openPipelineValue = openPipeline;
export const weightedPipelineValue = weightedPipeline;
export const conversionRate = conversion;
export const activityBuckets84Days = activityBuckets;
