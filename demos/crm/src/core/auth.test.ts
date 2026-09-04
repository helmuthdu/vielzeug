import { describe, expect, it } from 'vitest';
import { can } from './auth';
import { demoUsers } from './seed-data';
import { currentUser } from './store';

describe('CRM authorization', () => {
  it('keeps viewers read-only', () => {
    currentUser.value = demoUsers[2];
    expect(can('read')).toBe(true);
    expect(can('create')).toBe(false);
    expect(can('update')).toBe(false);
  });

  it('allows managers to manage records', () => {
    currentUser.value = demoUsers[0];
    expect(can('create')).toBe(true);
    expect(can('delete')).toBe(true);
  });
});
