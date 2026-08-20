import { en } from '../locales/en';
import {
  city,
  country,
  latitude,
  longitude,
  nearbyGPSCoordinate,
  state,
  street,
  streetAddress,
  zipCode,
} from '../location/location';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('location', () => {
  it('city is non-empty', () => {
    const value = city(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('street is non-empty', () => {
    const value = street(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('streetAddress starts with a number', () => {
    const value = streetAddress(ctx());

    expect(value).toMatch(/^\d+/);
  });

  it('zipCode is 5 digits', () => {
    const value = zipCode(ctx());

    expect(value).toMatch(/^\d{5}$/);
  });

  it('state is non-empty', () => {
    const value = state(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('country is non-empty', () => {
    const value = country(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('latitude is between -90 and 90', () => {
    const value = latitude(ctx());

    expect(value).toBeGreaterThanOrEqual(-90);
    expect(value).toBeLessThanOrEqual(90);
  });

  it('longitude is between -180 and 180', () => {
    const value = longitude(ctx());

    expect(value).toBeGreaterThanOrEqual(-180);
    expect(value).toBeLessThanOrEqual(180);
  });

  it('nearbyGPSCoordinate returns an object with lat/lng', () => {
    const value = nearbyGPSCoordinate(ctx());

    expect(typeof value.lat).toBe('number');
    expect(typeof value.lng).toBe('number');
  });
});
