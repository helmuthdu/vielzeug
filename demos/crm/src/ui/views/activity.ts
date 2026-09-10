import '../components/activity-item';
import '../components/activity-signal';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/select';
import { createPanGesture } from '@vielzeug/gesture';
import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { archiveActivity } from '../../core/activity-actions';
import { can } from '../../core/auth';
import { formatDate } from '../../core/format';
import { t } from '../../core/i18n';
import { crmData } from '../../core/store';
import type { Activity, ActivityCategory } from '../../core/types';

const categoryLabels: Record<ActivityCategory, () => string> = {
  call: () => t('activity.categoryCall'),
  email: () => t('activity.categoryEmail'),
  meeting: () => t('activity.categoryMeeting'),
  note: () => t('activity.categoryNote'),
  system: () => t('activity.categorySystem'),
  task: () => t('activity.categoryTask'),
};

function controlValue(event: Event): string {
  const detail = (event as CustomEvent<{ value?: string; values?: string[] }>).detail;
  return detail?.value ?? detail?.values?.[0] ?? '';
}

interface ActivityGroup {
  date: string;
  id: string;
  items: Activity[];
}

define('crm-activity-view', {
  setup() {
    const feed = ref<HTMLElement>();
    const category = signal<ActivityCategory | ''>('');
    const actor = signal('');
    const visible = signal(20);
    const filtered = computed(() =>
      crmData.value.activities.filter(
        (item) => (!category.value || item.category === category.value) && (!actor.value || item.actor === actor.value),
      ),
    );
    const groups = computed<ActivityGroup[]>(() => {
      const map = new Map<string, Activity[]>();
      for (const item of filtered.value.slice(0, visible.value)) {
        const key = item.createdAt.slice(0, 10);
        map.set(key, [...(map.get(key) ?? []), item]);
      }
      return [...map.entries()].map(([id, items]) => ({ date: formatDate(`${id}T12:00:00Z`), id, items }));
    });
    onMounted(() => {
      const gestures = new Map<HTMLElement, ReturnType<typeof createPanGesture>>();
      const stop = effect(() => {
        void groups.value;
        const allowed = can('delete');
        queueMicrotask(() => {
          if (!allowed) {
            for (const gesture of gestures.values()) gesture.dispose();
            gestures.clear();
            return;
          }
          for (const element of feed.value!.querySelectorAll<HTMLElement>('.activity-swipe')) {
            if (gestures.has(element)) continue;
            const gesture = createPanGesture(element, {
              axis: 'x',
              onEnd: ({ distance, reason }) => {
                element.style.transform = '';
                if (reason === 'release' && distance < -80) void archiveActivity(element.dataset.activityId ?? '');
              },
              onMove: ({ distance }) => {
                element.style.transform = `translateX(${Math.min(0, Math.max(-96, distance))}px)`;
              },
            });
            gestures.set(element, gesture);
          }
          for (const [element, gesture] of gestures)
            if (!element.isConnected) {
              gesture.dispose();
              gestures.delete(element);
            }
        });
      });
      onCleanup(() => {
        stop.dispose();
        for (const gesture of gestures.values()) gesture.dispose();
      });
    });
    const categories = computed(() => [
      { label: t('activity.allEventTypes'), value: '' },
      ...(Object.keys(categoryLabels) as ActivityCategory[]).map((value) => ({
        label: categoryLabels[value](),
        value,
      })),
    ]);
    const actors = computed(() => [
      { label: t('activity.allTeammates'), value: '' },
      ...[...new Set(crmData.value.activities.map((item) => item.actor))].map((value) => ({ label: value, value })),
    ]);
    return html`
      <header class="activity-header">
        <div>
          <h1>${() => t('companyDetail.activity')}</h1>
          <p>${() => t('activity.everyCustomerSignal')}</p>
        </div>
        <ore-button variant="outline" @click=${() => document.dispatchEvent(new CustomEvent('crm:simulate-live'))}>
          <ore-icon slot="prefix" name="radio" size="16"></ore-icon>
          ${() => t('action.simulateLiveActivity')}
        </ore-button>
      </header>
      <section class="module activity-overview">
        <header>
          <div>
            <h2>${() => t('dashboard.activitySignal')}</h2>
            <p>${() => t('activity.engagementDensity')}</p>
          </div>
          <strong>${() => filtered.value.length}</strong>
        </header>
        <activity-signal activities=${filtered}></activity-signal>
      </section>
      <div class="activity-layout">
        <aside class="activity-filters">
          <h2>${() => t('activity.filterActivity')}</h2>
          <ore-select
            label=${() => t('activity.eventType')}
            options=${categories}
            value=${category}
            @change=${(event: Event) => {
              category.value = controlValue(event) as ActivityCategory | '';
            }}></ore-select>
          <ore-select
            label=${() => t('activity.teammate')}
            options=${actors}
            value=${actor}
            @change=${(event: Event) => {
              actor.value = controlValue(event);
            }}></ore-select>
          <button
            type="button"
            @click=${() => {
              category.value = '';
              actor.value = '';
            }}>
            ${() => t('action.clearFilters')}
          </button>
        </aside>
        <section class="activity-stream" ref=${feed}>
          ${each(
            groups,
            (group) => group.id,
            (group) => html`
              <section class="activity-day">
                <header>
                  <h2>${() => group.value.date}</h2>
                  <span>${() => t('activity.events', { count: group.value.items.length })}</span>
                </header>
                ${each(
                  () => group.value.items,
                  (item) => item.id,
                  (item) => html`
                    <article class="activity-swipe" data-activity-id=${() => item.value.id}>
                      <span class=${() => `activity-kind activity-kind--${item.value.category}`}>
                        <ore-icon
                          name=${() => (item.value.category === 'email' ? 'mail' : item.value.category === 'meeting' ? 'calendar' : item.value.category === 'call' ? 'phone' : item.value.category === 'task' ? 'check-square' : 'activity')}
                          size="15"></ore-icon>
                      </span>
                      <div>
                        <strong>${() => item.value.actor}</strong>
                        <p>${() => item.value.description}</p>
                        <small>${() => categoryLabels[item.value.category]()}</small>
                      </div>
                      ${when(
                        () => can('delete'),
                        () => html`
                          <button
                            type="button"
                            aria-label=${() => t('activity.archiveActivityBy', { name: item.value.actor })}
                            @click=${() => void archiveActivity(item.value.id)}>
                            <ore-icon name="archive" size="15"></ore-icon>
                          </button>
                        `,
                      )}
                    </article>
                  `,
                )}
              </section>
            `,
          )}${() =>
            filtered.value.length > visible.value
              ? html`
                  <ore-button
                    variant="outline"
                    @click=${() => {
                      visible.value += 30;
                    }}>
                    ${() => t('action.loadOlderActivity')}
                  </ore-button>
                `
              : ''}
        </section>
      </div>
    `;
  },
  shadow: false,
});

export function createActivityView(): HTMLElement {
  return document.createElement('crm-activity-view');
}
