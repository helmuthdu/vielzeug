import {
  domainName,
  email,
  httpMethod,
  ip,
  mac,
  password,
  statusCode,
  url,
  userAgent,
  username,
} from '../internet/internet';
import { en } from '../locales/en';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('internet', () => {
  it('email matches the expected pattern', () => {
    const value = email(ctx());

    expect(value).toMatch(/^[a-z.]+@[a-z]+\.[a-z]+$/);
  });

  it('username is a non-empty string', () => {
    const value = username(ctx());

    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });

  it('password default length is 12', () => {
    const value = password(ctx());

    expect(value.length).toBe(12);
  });

  it('url starts with http', () => {
    const value = url(ctx());

    expect(value.startsWith('http')).toBe(true);
  });

  it('domainName contains a dot', () => {
    const value = domainName(ctx());

    expect(value).toContain('.');
  });

  it('ip (v4) matches the IPv4 pattern', () => {
    const value = ip(ctx(), 4);

    expect(value).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });

  it('mac matches the MAC address pattern', () => {
    const value = mac(ctx());

    expect(value).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i);
  });

  it('httpMethod is a valid HTTP method', () => {
    const value = httpMethod(ctx());
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    expect(methods).toContain(value);
  });

  it('statusCode is a number >= 100 and < 600', () => {
    const value = statusCode(ctx());

    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(100);
    expect(value).toBeLessThan(600);
  });

  it('userAgent contains "Mozilla"', () => {
    const value = userAgent(ctx());

    expect(value).toContain('Mozilla');
  });

  it('ip (v6) matches the IPv6 format (8 groups of 1-4 hex chars)', () => {
    const value = ip(ctx(), 6);

    expect(value).toMatch(/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i);
  });

  it('password with length: 8 returns a string of length 8', () => {
    const value = password(ctx(), { length: 8 });

    expect(value).toHaveLength(8);
  });

  it('password with memorable: true and length: 10 returns a string of length 10', () => {
    const value = password(ctx(), { length: 10, memorable: true });

    expect(value).toHaveLength(10);
  });
});
