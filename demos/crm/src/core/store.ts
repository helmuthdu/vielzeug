import type { Readable, Signal } from '@vielzeug/ripple';
import { computed, fromSubscribable, signal } from '@vielzeug/ripple';
import type { RouteParams } from '@vielzeug/wayfinder';
import { router } from './router';
import { demoUsers, generateDemoData, seedData } from './seed-data';
import type { Activity, CrmData, DemoUser, Opportunity, OpportunityStage } from './types';

export const crmData: Signal<CrmData> = signal(structuredClone(seedData));
export const currentUser: Signal<DemoUser> = signal(demoUsers[0]);
export const locale = signal<'de' | 'en'>('en');
export const networkStatus = signal<'offline' | 'online' | 'syncing'>('online');

const routeBinding = fromSubscribable<ReturnType<typeof router.getSnapshot>>({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (listener) => router.subscribe(() => listener()),
});

export const activeRoute: Readable<string | null> = computed(() => routeBinding.value.matches.at(-1)?.name ?? null);
export const activeRouteParams: Readable<RouteParams> = computed(() => routeBinding.value.matches.at(-1)?.params ?? {});

export function opportunitiesByStage(stage: OpportunityStage): Opportunity[] {
  return crmData.value.opportunities.filter((opportunity) => opportunity.stage === stage);
}

export function patchOpportunity(id: string, patch: Partial<Opportunity>): void {
  crmData.value = {
    ...crmData.value,
    opportunities: crmData.value.opportunities.map((opportunity) =>
      opportunity.id === id ? { ...opportunity, ...patch } : opportunity,
    ),
  };
}

export function prependActivity(activity: Activity): void {
  crmData.value = { ...crmData.value, activities: [activity, ...crmData.value.activities] };
}

export function regenerateDemoData(): void {
  crmData.value = generateDemoData(`vielzeug-crm-${Date.now()}`);
}
