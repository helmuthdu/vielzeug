import { float } from '../_helpers/float';
import { pick } from '../_helpers/string';
import type { IllusionistContext } from '../types';
import { LOREM_DATA } from './data';

/** Picks a single random word from the lorem word pool. */
export function word(ctx: IllusionistContext): string {
  return pick(LOREM_DATA.words, ctx.source)!;
}

/** Builds a space-joined run of `count` random words (default 3). */
export function words(ctx: IllusionistContext, count = 3): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(word(ctx));
  }
  return out.join(' ');
}

/** Builds a sentence of `wordCount` words (default 6-12) with a capital first letter and trailing period. */
export function sentence(ctx: IllusionistContext, wordCount?: number): string {
  const count = wordCount ?? Math.floor(float(6, 13, ctx.source));
  const text = words(ctx, count);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/** Builds `count` space-joined sentences (default 3). */
export function sentences(ctx: IllusionistContext, count = 3): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(sentence(ctx));
  }
  return out.join(' ');
}

/** Builds a paragraph of `sentenceCount` sentences (default 3-7), space-joined. */
export function paragraph(ctx: IllusionistContext, sentenceCount?: number): string {
  const count = sentenceCount ?? Math.floor(float(3, 8, ctx.source));
  return sentences(ctx, count);
}

/** Builds `count` newline-joined paragraphs (default 3). */
export function paragraphs(ctx: IllusionistContext, count = 3): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(paragraph(ctx));
  }
  return out.join('\n');
}

/** Builds a hyphen-joined slug of `wordCount` words (default 3). */
export function slug(ctx: IllusionistContext, wordCount = 3): string {
  const out: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    out.push(word(ctx));
  }
  return out.join('-');
}

/** Builds `count` newline-joined lines, each a sentence (default 5). */
export function lines(ctx: IllusionistContext, count = 5): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(sentence(ctx));
  }
  return out.join('\n');
}
