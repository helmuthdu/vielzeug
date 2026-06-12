const escapeMap: Record<string, string> = {
  "'": '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Escapes HTML entities.
 */
export function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => escapeMap[char]);
}
