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
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 2_147_483_647) {
    throw new RangeError(`${name} must be between 0 and 2147483647 milliseconds`);
  }
}
