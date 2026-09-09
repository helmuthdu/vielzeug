/** Pads both sides of a string to reach `targetLength`. */
export function padCenter(value: string, targetLength: number, fill = ' '): string {
  if (targetLength <= value.length) return value;

  const total = targetLength - value.length;
  const left = Math.floor(total / 2);

  return value.padStart(value.length + left, fill).padEnd(targetLength, fill);
}
