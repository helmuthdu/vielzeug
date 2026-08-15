export function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

export function assertDuration(milliseconds: number, name: string): void {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to zero`);
  }
}
