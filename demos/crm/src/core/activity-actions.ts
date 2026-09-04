import { can } from './auth';
import { bus } from './events';
import { ledger } from './history';
import { t } from './i18n';
import { crmData } from './store';

export async function archiveActivity(id: string): Promise<boolean> {
  if (!can('delete')) return false;

  const index = crmData.value.activities.findIndex((item) => item.id === id);
  if (index < 0) return false;

  const activity = crmData.value.activities[index];
  await ledger.do({
    apply: () => {
      crmData.value = { ...crmData.value, activities: crmData.value.activities.filter((item) => item.id !== id) };
    },
    label: t('activity.archiveActivityBy', { name: activity.actor }),
    revert: () => {
      const activities = [...crmData.value.activities];
      activities.splice(index, 0, activity);
      crmData.value = { ...crmData.value, activities };
    },
  });
  bus.emit('toast:show', {
    action: { label: t('action.undo'), run: () => void ledger.undo() },
    message: t('activity.activityArchived'),
    variant: 'success',
  });
  return true;
}
