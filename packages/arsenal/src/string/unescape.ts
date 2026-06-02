const unescapeMap: Record<string, string> = {
  '&#39;': "'",
  '&amp;': '&',
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"',
};

/**
 * Unescapes HTML entities.
 */
export function unescape(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => unescapeMap[entity] ?? entity);
}
