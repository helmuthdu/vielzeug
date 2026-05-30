/**
 * Helpers for accepting raw literal values alongside schema instances in
 * sUnion() and sIntersect() arguments.
 *
 * Moved out of literal.ts — this infrastructure belongs to the combinator
 * entry points (s.ts), not to LiteralSchema.
 */

import type { AnySchema } from '../core';

import { Schema } from '../core';
import { LiteralSchema } from './literal';

export type LiteralValue = string | number | boolean | null | undefined;
export type RawOrSchema = AnySchema | LiteralValue;
export type NormalizeItem<T> = T extends AnySchema ? T : T extends LiteralValue ? LiteralSchema<T> : never;
export type NormalizeItems<T extends readonly RawOrSchema[]> = { readonly [K in keyof T]: NormalizeItem<T[K]> };

export function normalizeToSchemas<T extends readonly RawOrSchema[]>(items: T): NormalizeItems<T> {
  return items.map((item) =>
    item instanceof Schema ? item : new LiteralSchema(item as LiteralValue),
  ) as unknown as NormalizeItems<T>;
}
