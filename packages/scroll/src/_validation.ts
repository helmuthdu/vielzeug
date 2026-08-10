import { ScrollConfigurationError } from './errors';

export function requireNonNegativeInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new ScrollConfigurationError(`${name} must be a finite non-negative integer.`);
  }

  return value;
}

export function requireNonNegativeNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ScrollConfigurationError(`${name} must be a finite non-negative number.`);
  }

  return value;
}

export function requirePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1e7) {
    throw new ScrollConfigurationError(`${name} must be a finite positive number no greater than 10000000.`);
  }

  return value;
}

export function validateOverscan(overscan: number | { end?: number; start?: number }, name = 'overscan'): void {
  if (typeof overscan === 'number') {
    requireNonNegativeInteger(overscan, name);

    return;
  }

  if (overscan === null || typeof overscan !== 'object' || Array.isArray(overscan)) {
    throw new ScrollConfigurationError(`${name} must be a finite non-negative integer or an overscan object.`);
  }

  if (overscan.start !== undefined) requireNonNegativeInteger(overscan.start, `${name}.start`);

  if (overscan.end !== undefined) requireNonNegativeInteger(overscan.end, `${name}.end`);
}
