/**
 * Computes a safe `rel` attribute value for anchor elements.
 *
 * When `target="_blank"`, automatically injects `noopener` and `noreferrer`
 * to prevent reverse tabnapping attacks (the opened page accessing
 * `window.opener` to redirect the origin).
 *
 * @param rel    - The explicit `rel` prop value (may be undefined).
 * @param target - The link `target` prop value (may be undefined).
 * @returns A `rel` string with security tokens merged in, or `null` when no
 *          rel is needed.
 */
export function computeSafeRel(rel: string | undefined, target: string | undefined): string | null {
  const base = rel ?? '';

  if (target !== '_blank') return base || null;

  const parts = new Set(base.split(/\s+/).filter(Boolean));

  parts.add('noopener');
  parts.add('noreferrer');

  return [...parts].join(' ');
}
