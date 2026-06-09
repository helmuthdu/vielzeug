import { computeSafeRel } from '../link';

describe('computeSafeRel', () => {
  it('returns null when no rel and target is not _blank', () => {
    expect(computeSafeRel(undefined, '_self')).toBeNull();
  });

  it('returns null when no rel and no target', () => {
    expect(computeSafeRel(undefined, undefined)).toBeNull();
  });

  it('returns rel as-is when target is not _blank', () => {
    expect(computeSafeRel('external', '_self')).toBe('external');
  });

  it('adds noopener and noreferrer when target is _blank', () => {
    const rel = computeSafeRel(undefined, '_blank') ?? '';

    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('merges custom rel with security tokens for _blank', () => {
    const rel = computeSafeRel('external', '_blank') ?? '';

    expect(rel).toContain('external');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('does not duplicate noopener/noreferrer if already present', () => {
    const rel = computeSafeRel('noopener noreferrer', '_blank') ?? '';
    const parts = rel.split(' ');

    expect(parts.filter((p) => p === 'noopener')).toHaveLength(1);
    expect(parts.filter((p) => p === 'noreferrer')).toHaveLength(1);
  });
});
