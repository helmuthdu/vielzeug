export type OpportunityStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';
export type ActivityKind =
  | 'company.updated'
  | 'contact.created'
  | 'contact.updated'
  | 'lead.created'
  | 'lead.updated'
  | 'opportunity.stageChanged'
  | 'opportunity.updated';
export type ActivityCategory = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'system';
export type CompanyHealth = 'healthy' | 'watch' | 'risk';
export type CompanyTier = 'strategic' | 'growth' | 'standard';
export type LeadSource = 'Referral' | 'Inbound' | 'Event' | 'Outbound';
export type UserRole = 'manager' | 'sales' | 'viewer';

export interface Company {
  city: string;
  country: string;
  employees: number;
  health: CompanyHealth;
  id: string;
  industry: string;
  lastActivityAt: string;
  name: string;
  ownerId: string;
  revenue: string;
  tier: CompanyTier;
  website: string;
}

export interface Contact {
  companyId: string;
  email: string;
  id: string;
  lastContactAt: string;
  name: string;
  ownerId: string;
  status: 'active' | 'inactive';
  title: string;
}

export interface Lead {
  companyId: string;
  createdAt: string;
  id: string;
  name: string;
  ownerId: string;
  source: LeadSource;
  status: 'new' | 'working' | 'qualified';
}

export interface Opportunity {
  amount: string;
  companyId: string;
  contactId: string;
  expectedClose: string;
  id: string;
  name: string;
  ownerId: string;
  probability: number;
  stage: OpportunityStage;
}

export interface Activity {
  actor: string;
  category: ActivityCategory;
  companyId?: string;
  contactId?: string;
  createdAt: string;
  description: string;
  id: string;
  kind: ActivityKind;
  leadId?: string;
  opportunityId?: string;
}

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
}

export interface CrmData {
  activities: Activity[];
  companies: Company[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
}
