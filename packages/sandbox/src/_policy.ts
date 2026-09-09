import { SandboxConfigurationError } from './errors.js';
import type { SandboxOptions } from './types.js';

export interface NormalizedSandboxOptions {
  allowedFontOrigins: string[];
  allowedImageOrigins: string[];
  allowedScriptOrigins: string[];
  allowedStyleOrigins: string[];
  lang: string;
  nonce: string | undefined;
  readyTimeout: number;
  scripts: string[];
  styles: Record<string, string>;
  title: string;
}

export const DEFAULT_READY_TIMEOUT_MS = 5000;

const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const LANG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const NONCE = /^[A-Za-z0-9+/_-]+={0,2}$/;

function fail(field: string, value: unknown): never {
  throw new SandboxConfigurationError(`${field} is invalid: ${String(value)}`);
}

function normalizeOrigin(value: unknown, field: string): string {
  if (typeof value !== 'string') return fail(field, value);

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return fail(field, value);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    return fail(field, value);
  }

  return url.origin;
}

function normalizeOrigins(values: string[] | undefined, field: string): string[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) return fail(field, values);

  return values.map((value) => normalizeOrigin(value, field));
}

function normalizeScript(value: unknown): string {
  if (typeof value !== 'string') return fail('scripts', value);

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return fail('scripts', value);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('scripts', value);

  return url.href;
}

function normalizeStyles(styles: Record<string, string> | undefined): Record<string, string> {
  if (styles === undefined) return {};
  if (typeof styles !== 'object' || styles === null || Array.isArray(styles)) return fail('styles', styles);

  const normalized: Record<string, string> = {};

  for (const [id, css] of Object.entries(styles)) {
    if (!ID.test(id) || typeof css !== 'string') fail('styles', id);

    normalized[id] = css;
  }

  return normalized;
}

export function normalizeSandboxOptions(options: SandboxOptions = {}): NormalizedSandboxOptions {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) fail('options', options);

  const lang = options.lang ?? 'en';

  if (!LANG.test(lang)) fail('lang', lang);

  if (options.nonce !== undefined && (!NONCE.test(options.nonce) || options.nonce.length === 0)) {
    fail('nonce', options.nonce);
  }

  if (options.title !== undefined && typeof options.title !== 'string') fail('title', options.title);

  const rawReadyTimeout = options.readyTimeout;
  const readyTimeout = rawReadyTimeout ?? DEFAULT_READY_TIMEOUT_MS;

  if (
    rawReadyTimeout !== undefined &&
    (rawReadyTimeout === null ||
      typeof rawReadyTimeout !== 'number' ||
      !Number.isFinite(rawReadyTimeout) ||
      rawReadyTimeout <= 0 ||
      rawReadyTimeout > 2 ** 31 - 1)
  ) {
    fail('readyTimeout', rawReadyTimeout);
  }

  if (options.scripts !== undefined && !Array.isArray(options.scripts)) fail('scripts', options.scripts);

  const scripts = (options.scripts ?? []).map(normalizeScript);

  return {
    allowedFontOrigins: normalizeOrigins(options.allowedFontOrigins, 'allowedFontOrigins'),
    allowedImageOrigins: normalizeOrigins(options.allowedImageOrigins, 'allowedImageOrigins'),
    allowedScriptOrigins: normalizeOrigins(options.allowedScriptOrigins, 'allowedScriptOrigins'),
    allowedStyleOrigins: normalizeOrigins(options.allowedStyleOrigins, 'allowedStyleOrigins'),
    lang,
    nonce: options.nonce,
    readyTimeout,
    scripts,
    styles: normalizeStyles(options.styles),
    title: options.title ?? '',
  };
}

export function buildCspFromOptions(options: NormalizedSandboxOptions): string {
  const scriptOrigins = [
    "'unsafe-inline'",
    ...(options.nonce ? [`'nonce-${options.nonce}'`] : []),
    ...options.allowedScriptOrigins,
    ...options.scripts.map((script) => new URL(script).origin),
  ].join(' ');
  const styleOrigins = ["'unsafe-inline'", ...options.allowedStyleOrigins].join(' ');
  const imageOrigins = ['data:', ...options.allowedImageOrigins].join(' ');
  const fontOrigins = options.allowedFontOrigins.join(' ') || "'none'";

  return [
    "default-src 'none'",
    `script-src ${scriptOrigins}`,
    `style-src ${styleOrigins}`,
    `img-src ${imageOrigins}`,
    `font-src ${fontOrigins}`,
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
}

export function buildCsp(options: SandboxOptions = {}): string {
  return buildCspFromOptions(normalizeSandboxOptions(options));
}
