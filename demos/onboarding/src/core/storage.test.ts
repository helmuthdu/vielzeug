import { describe, expect, it } from 'vitest';
import { createLocalBeaconStorage } from './storage';

describe('createLocalBeaconStorage', () => {
  it('round-trips a progress record through localStorage', () => {
    const storage = createLocalBeaconStorage();
    const key = 'test-tour';
    const record = { status: 'completed', stepIndex: 4, version: 1 } as const;

    expect(storage.get(key)).toBeNull();

    storage.set(key, record);

    expect(storage.get(key)).toEqual(record);

    storage.remove(key);

    expect(storage.get(key)).toBeNull();
  });

  it('namespaces keys so unrelated storage is untouched', () => {
    const storage = createLocalBeaconStorage();

    storage.set('alpha', { status: 'active', stepIndex: 0, version: 1 });

    expect(window.localStorage.getItem('vielzeug-onboarding:alpha')).not.toBeNull();
    expect(window.localStorage.getItem('alpha')).toBeNull();

    storage.remove('alpha');
  });
});
