import { float } from '../_helpers/float';
import { pick } from '../_helpers/string';
import type { IllusionistContext, LocationLocaleData } from '../types';

function data(ctx: IllusionistContext): LocationLocaleData {
  return ctx.locale.location;
}

/** A geographic coordinate pair. */
export type Coordinate = {
  lat: number;
  lng: number;
};

/** Picks a random city from the locale dataset. */
export function city(ctx: IllusionistContext): string {
  return pick(data(ctx).cities, ctx.source)!;
}

/** Picks a random street from the locale dataset. */
export function street(ctx: IllusionistContext): string {
  return pick(data(ctx).streets, ctx.source)!;
}

/** Builds a street address: a house number (1-999) followed by a street name. */
export function streetAddress(ctx: IllusionistContext): string {
  const houseNumber = Math.floor(float(1, 1000, ctx.source));
  return `${houseNumber} ${street(ctx)}`;
}

/** Generates a ZIP/postal code matching the locale's pattern (`#` = digit, other chars preserved). */
export function zipCode(ctx: IllusionistContext): string {
  const pattern = data(ctx).zipPattern;

  return pattern.replace(/#/g, () => String(Math.floor((ctx.source.next() ?? 0) * 10)));
}

/** Picks a random state/region from the locale dataset. */
export function state(ctx: IllusionistContext): string {
  return pick(data(ctx).states, ctx.source)!;
}

/** Picks a random country from the locale dataset. */
export function country(ctx: IllusionistContext): string {
  return pick(data(ctx).countries, ctx.source)!;
}

/** Generates a random latitude in the range [-90, 90]. */
export function latitude(ctx: IllusionistContext): number {
  return float(-90, 90, ctx.source);
}

/** Generates a random longitude in the range [-180, 180]. */
export function longitude(ctx: IllusionistContext): number {
  return float(-180, 180, ctx.source);
}

/**
 * Returns a coordinate within ~1 degree of the reference point.
 * When no reference is provided, a random coordinate is used.
 */
export function nearbyGPSCoordinate(ctx: IllusionistContext, ref?: Coordinate): Coordinate {
  const base = ref ?? { lat: latitude(ctx), lng: longitude(ctx) };
  return {
    lat: float(base.lat - 1, base.lat + 1, ctx.source),
    lng: float(base.lng - 1, base.lng + 1, ctx.source),
  };
}
