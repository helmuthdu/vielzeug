import { uuid as cryptoUuid } from '@vielzeug/arsenal/random';

import { int } from '../_helpers/int';
import { alphanumeric, pick } from '../_helpers/string';
import type { IllusionistContext } from '../types';
import { SYSTEM_DATA } from './data';

/** Generates a random file extension from common types. */
export function fileExtension(ctx: IllusionistContext): string {
  return pick(SYSTEM_DATA.fileExtensions, ctx.source)!;
}

/** Generates a random file name with extension. */
export function fileName(ctx: IllusionistContext): string {
  const base = pick(SYSTEM_DATA.fileNames, ctx.source)!;
  const ext = fileExtension(ctx);

  return `${base}.${ext}`;
}

/** Generates a random file path with 1-4 directory segments and a file name. */
export function filePath(ctx: IllusionistContext): string {
  const segments = int(1, 4, ctx.source);
  const dirs: string[] = [];

  for (let i = 0; i < segments; i++) {
    dirs.push(pick(SYSTEM_DATA.directories, ctx.source)!);
  }

  return `${dirs.join('/')}/${fileName(ctx)}`;
}

/** Returns a random MIME type string. */
export function mimeType(ctx: IllusionistContext): string {
  const types = Object.values(SYSTEM_DATA.mimeTypes);

  return pick(types, ctx.source)!;
}

/** Generates a random semver version string. */
export function semver(ctx: IllusionistContext, options?: { maxMajor?: number; includePrerelease?: boolean }): string {
  const maxMajor = options?.maxMajor ?? 20;
  const major = int(0, maxMajor, ctx.source);
  const minor = int(0, 20, ctx.source);
  const patch = int(0, 99, ctx.source);

  let version = `${major}.${minor}.${patch}`;

  if (options?.includePrerelease && ctx.source.next() < 0.3) {
    const labels = ['alpha', 'beta', 'rc', 'next'];
    const label = pick(labels, ctx.source)!;
    const num = int(1, 10, ctx.source);

    version += `-${label}.${num}`;
  }

  return version;
}

/**
 * Generates a random UUID via `crypto.randomUUID()`.
 *
 * **Not deterministic** — ignores the seeded `RandomSource` and always uses
 * cryptographic randomness. Use this for unique identifiers where
 * unpredictability matters more than reproducibility.
 */
export function uuid(): string {
  return cryptoUuid();
}

/** Generates a random port number (1-65535, avoiding well-known ports below 1024 by default). */
export function port(ctx: IllusionistContext, options?: { min?: number; max?: number }): number {
  const min = options?.min ?? 1024;
  const max = options?.max ?? 65535;

  return int(min, max, ctx.source);
}

/** Returns a random cron expression from common patterns. */
export function cron(ctx: IllusionistContext): string {
  return pick(SYSTEM_DATA.cronExpressions, ctx.source)!;
}

/** Generates a random process name. */
export function process(ctx: IllusionistContext): string {
  const prefixes = ['node', 'python', 'ruby', 'java', 'go', 'rust', 'bash'];
  const prefix = pick(prefixes, ctx.source)!;
  const suffix = alphanumeric(int(3, 8, ctx.source), ctx.source);

  return `${prefix}_${suffix}`;
}
