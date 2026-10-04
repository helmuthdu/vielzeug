let next = 0;

/** Document-unique id for SVG references such as gradients. */
export function uniqueId(prefix: string): string {
  next += 1;

  return `${prefix}-${next}`;
}
