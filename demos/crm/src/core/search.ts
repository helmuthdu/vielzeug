import { effect } from '@vielzeug/ripple';
import { createIndex } from '@vielzeug/scout';
import { crmData } from './store';

export interface SearchRecord {
  id: string;
  kind: 'Companies' | 'Contacts' | 'Leads' | 'Opportunities';
  label: string;
  meta: string;
}

function records(): SearchRecord[] {
  const data = crmData.value;
  return [
    ...data.companies.map((item) => ({
      id: item.id,
      kind: 'Companies' as const,
      label: item.name,
      meta: item.industry,
    })),
    ...data.contacts.map((item) => ({ id: item.id, kind: 'Contacts' as const, label: item.name, meta: item.title })),
    ...data.leads.map((item) => ({ id: item.id, kind: 'Leads' as const, label: item.name, meta: item.source })),
    ...data.opportunities.map((item) => ({
      id: item.id,
      kind: 'Opportunities' as const,
      label: item.name,
      meta: item.stage,
    })),
  ];
}

export const crmIndex = createIndex<SearchRecord>(records(), {
  fields: ['label', 'meta'],
  // Records are rebuilt from the store on every effect run; identify them by id.
  key: (record) => record.id,
});
effect(() => {
  crmIndex.setItems(records());
});
