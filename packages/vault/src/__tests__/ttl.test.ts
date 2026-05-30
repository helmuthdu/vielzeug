import { createLocalStorage, table, ttl, type TtlMs } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('ttl helpers', () => {
  describe('duration conversion', () => {
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
  });

  describe('validation', () => {
    test('rejects negative input', () => {
      expect(() => ttl.ms(-1)).toThrow('ttl.ms expected a finite positive number');
    });

    test('rejects zero input (would create an immediately-expired record)', () => {
      expect(() => ttl.ms(0)).toThrow('ttl.ms expected a finite positive number');
    });

    test('rejects NaN input', () => {
      expect(() => ttl.seconds(Number.NaN)).toThrow('ttl.seconds expected a finite positive number');
    });

    test('rejects infinite input', () => {
      expect(() => ttl.minutes(Number.POSITIVE_INFINITY)).toThrow('ttl.minutes expected a finite positive number');
    });

    test('rejects zero for compound helpers (ttl.seconds(0))', () => {
      expect(() => ttl.seconds(0)).toThrow('ttl.seconds expected a finite positive number');
    });
  });

  describe('integration with writes', () => {
    test('can be used with put and causes expiration', async () => {
      window.localStorage.clear();

      const db = createLocalStorage({ name: 'TtlHelper', schema: userSchema });

      await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
      await delay(5);

      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('put rejects invalid ttl values', async () => {
      window.localStorage.clear();

      const db = createLocalStorage({ name: 'TtlHelper', schema: userSchema });

      await expect(db.put('users', { id: 1, name: 'Alice' }, Number.NaN as unknown as TtlMs)).rejects.toThrow(
        'expected a finite positive number',
      );
    });
  });
});
