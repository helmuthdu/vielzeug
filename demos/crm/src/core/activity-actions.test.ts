import { beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveActivity } from './activity-actions';
import { bus } from './events';
import { ledger } from './history';
import { demoUsers, seedData } from './seed-data';
import { crmData, currentUser } from './store';

beforeEach(async () => {
  crmData.value = structuredClone(seedData);
  currentUser.value = demoUsers[0];
  await ledger.clear();
});

describe('activity actions', () => {
  it('archives activity and exposes undo through the toast event', async () => {
    const listener = vi.fn();
    const unsubscribe = bus.on('toast:show', listener);
    const activity = crmData.value.activities[0];

    await expect(archiveActivity(activity.id)).resolves.toBe(true);
    expect(crmData.value.activities).not.toContainEqual(activity);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ action: expect.any(Object) }));

    listener.mock.calls[0][0].action.run();
    await vi.waitFor(() => expect(crmData.value.activities).toContainEqual(activity));
    unsubscribe();
  });

  it('keeps viewers read-only', async () => {
    currentUser.value = demoUsers[2];
    const activities = crmData.value.activities;

    await expect(archiveActivity(activities[0].id)).resolves.toBe(false);
    expect(crmData.value.activities).toBe(activities);
  });
});
