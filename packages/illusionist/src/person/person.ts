import { boolean } from '../_helpers/boolean';
import { pick } from '../_helpers/string';
import type { IllusionistContext, PersonLocaleData } from '../types';

function data(ctx: IllusionistContext): PersonLocaleData {
  return ctx.locale.person;
}

export function firstName(ctx: IllusionistContext): string {
  const d = data(ctx);
  const pool = boolean(ctx.source) ? d.firstNameMale : d.firstNameFemale;
  return pick(pool, ctx.source)!;
}

export function lastName(ctx: IllusionistContext): string {
  return pick(data(ctx).lastName, ctx.source)!;
}

export function fullName(ctx: IllusionistContext): string {
  return `${firstName(ctx)} ${lastName(ctx)}`;
}

export function gender(ctx: IllusionistContext): string {
  return pick(data(ctx).gender, ctx.source)!;
}

export function prefix(ctx: IllusionistContext): string {
  return pick(data(ctx).prefix, ctx.source)!;
}

export function suffix(ctx: IllusionistContext): string {
  const d = data(ctx);
  if (d.suffix.length === 0) return '';
  return pick(d.suffix, ctx.source)!;
}

export function jobTitle(ctx: IllusionistContext): string {
  const d = data(ctx);
  return `${pick(d.jobAreas, ctx.source)!} ${pick(d.jobTypes, ctx.source)!}`;
}
