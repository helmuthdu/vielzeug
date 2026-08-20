import { en } from '../locales/en';
import { createSeed } from '../seed/create-seed';
import { cron, fileExtension, fileName, filePath, mimeType, port, process, semver, uuid } from '../system/system';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('system', () => {
  it('fileExtension is non-empty', () => {
    const value = fileExtension(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('fileName contains a dot', () => {
    const value = fileName(ctx());

    expect(value).toContain('.');
  });

  it('filePath starts with a directory name', () => {
    const value = filePath(ctx());

    expect(value).toMatch(/^[^/]+\//);
  });

  it('mimeType contains a slash', () => {
    const value = mimeType(ctx());

    expect(value).toContain('/');
  });

  it('semver matches the semver pattern', () => {
    const value = semver(ctx());

    expect(value).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('port is between 1024 and 65535', () => {
    const value = port(ctx());

    expect(value).toBeGreaterThanOrEqual(1024);
    expect(value).toBeLessThanOrEqual(65535);
  });

  it('cron contains 5 space-separated parts', () => {
    const value = cron(ctx());

    expect(value.split(' ')).toHaveLength(5);
  });

  it('process contains an underscore', () => {
    const value = process(ctx());

    expect(value).toContain('_');
  });

  it('uuid() returns a valid UUID format', () => {
    const value = uuid();

    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('uuid() is not deterministic — two calls with the same seed produce different values', () => {
    const a = uuid();
    const b = uuid();

    expect(a).not.toBe(b);
  });
});
