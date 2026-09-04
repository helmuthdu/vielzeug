import { effect } from '@vielzeug/ripple';
import type { VaultStore } from '@vielzeug/vault';
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';
import { setLocale } from './i18n';
import { seedData } from './seed-data';
import { crmData, currentUser, locale } from './store';
import { setThemePreference, type ThemePreference, themePreference } from './theme';
import type { Activity, ActivityCategory, Company, CrmData } from './types';

export const CRM_DATA_VERSION = 2;

type LegacyCompany = Omit<Company, 'city' | 'country' | 'employees' | 'health' | 'tier' | 'website'> &
  Partial<Pick<Company, 'city' | 'country' | 'employees' | 'health' | 'tier' | 'website'>>;
type LegacyActivity = Omit<Activity, 'category'> & Partial<Pick<Activity, 'category'>>;
type LegacyCrmData = Omit<CrmData, 'activities' | 'companies'> & {
  activities: LegacyActivity[];
  companies: LegacyCompany[];
};
type DataRow = { data: CrmData | LegacyCrmData; id: 'current'; version?: number };
type PreferencesRow = { id: 'preferences'; locale: 'de' | 'en'; theme: ThemePreference; userId: string };
const schema = { data: table<DataRow, 'id'>('id'), preferences: table<PreferencesRow, 'id'>('id') };
const vault: VaultStore<typeof schema> = createLocalStorage({ name: 'vielzeug-crm', schema });
const activityCategories: ActivityCategory[] = ['call', 'email', 'meeting', 'note', 'task', 'system'];

function websiteFor(name: string): string {
  return `https://${name.toLowerCase().replaceAll(' ', '-')}.example`;
}

export function normalizeCrmData(data: CrmData | LegacyCrmData): CrmData {
  const companies = data.companies.map((company) => {
    const fallback = seedData.companies.find((item) => item.id === company.id);
    return {
      ...company,
      city: company.city ?? fallback?.city ?? 'Unknown',
      country: company.country ?? fallback?.country ?? 'Unknown',
      employees: company.employees ?? fallback?.employees ?? 0,
      health: company.health ?? fallback?.health ?? 'watch',
      tier: company.tier ?? fallback?.tier ?? 'standard',
      website: company.website ?? fallback?.website ?? websiteFor(company.name),
    };
  });
  const companyByOpportunity = new Map(data.opportunities.map((item) => [item.id, item.companyId]));
  const companyByContact = new Map(data.contacts.map((item) => [item.id, item.companyId]));
  const companyByLead = new Map(data.leads.map((item) => [item.id, item.companyId]));
  const activities = data.activities.map((activity) => ({
    ...activity,
    category: activityCategories.includes(activity.category as ActivityCategory)
      ? (activity.category as ActivityCategory)
      : 'system',
    companyId:
      activity.companyId ??
      (activity.opportunityId ? companyByOpportunity.get(activity.opportunityId) : undefined) ??
      (activity.contactId ? companyByContact.get(activity.contactId) : undefined) ??
      (activity.leadId ? companyByLead.get(activity.leadId) : undefined),
  }));
  return { ...data, activities, companies };
}

export async function setupPersistence(): Promise<void> {
  const [savedData, preferences] = await Promise.all([
    vault.get('data', 'current'),
    vault.get('preferences', 'preferences'),
  ]);
  if (savedData) {
    const data = normalizeCrmData(savedData.data);
    crmData.value = data;
    if (savedData.version !== CRM_DATA_VERSION)
      await vault.put('data', { data, id: 'current', version: CRM_DATA_VERSION });
  } else await vault.put('data', { data: crmData.value, id: 'current', version: CRM_DATA_VERSION });
  if (preferences) {
    setThemePreference(preferences.theme);
    setLocale(preferences.locale);
    const user = ['alex', 'sarah', 'guest'].includes(preferences.userId) ? preferences.userId : 'alex';
    currentUser.value = {
      alex: { id: 'alex', name: 'Alex Morgan', role: 'manager', title: 'Sales Manager' },
      guest: { id: 'guest', name: 'Guest', role: 'viewer', title: 'Viewer' },
      sarah: { id: 'sarah', name: 'Sarah Chen', role: 'sales', title: 'Sales Representative' },
    }[user] as typeof currentUser.value;
  }
  effect(() => {
    void vault.put('data', { data: crmData.value, id: 'current', version: CRM_DATA_VERSION });
  });
  effect(() => {
    void vault.put('preferences', {
      id: 'preferences',
      locale: locale.value,
      theme: themePreference.value,
      userId: currentUser.value.id,
    });
  });
}
