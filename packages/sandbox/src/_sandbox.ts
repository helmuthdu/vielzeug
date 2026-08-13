import { buildCspFromOptions, normalizeSandboxOptions } from './_policy.js';
import type { SandboxOptions } from './types.js';

export { buildDocument } from './_document.js';
export { createSandbox } from './_runtime.js';

export function buildCsp(options: SandboxOptions = {}): string {
  return buildCspFromOptions(normalizeSandboxOptions(options));
}
