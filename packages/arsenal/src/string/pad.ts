/**
 * Pads a string on both sides to reach the target length.
 */
export function pad(str: string, targetLength: number, fillString = ' '): string {
  if (targetLength <= str.length) return str;

  const total = targetLength - str.length;
  const left = Math.floor(total / 2);

  return str.padStart(str.length + left, fillString).padEnd(targetLength, fillString);
}
