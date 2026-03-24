import { createLocalStorage, defineSchema, ttl } from '../index';

/* -------------------- Shared fixtures -------------------- */

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = defineSchema<{ users: User }>({
  users: { indexes: ['name', 'age', 'city'], key: 'id' },
});

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ==================== ttl helpers ==================== */

describe('ttl helpers', () => {
  test('ms passes value through', () => {
    expect(ttl.ms(500)).toBe(500);
  });

  test('seconds converts to milliseconds', () => {
    expect(ttl.seconds(2)).toBe(2000);
  });

  test('minutes converts to milliseconds', () => {
    expect(ttl.minutes(1)).toBe(60_000);
  });

  test('hours converts to milliseconds', () => {
    expect(ttl.hours(1)).toBe(3_600_000);
  });

  test('days converts to milliseconds', () => {
    expect(ttl.days(1)).toBe(86_400_000);
  });

  test('ttl helpers can be used with put', async () => {
    localStorage.clear();

    const db = createLocalStorage({ dbName: 'TtlHelper', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);
    expect(await db.get('users', 1)).toBeUndefined();
  });
});
