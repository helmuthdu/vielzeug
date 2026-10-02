import { describe, expect, it } from 'vitest';

import { nextTrainVersion } from '../train-version.mjs';

describe('nextTrainVersion()', () => {
  const october = new Date('2026-10-01T12:00:00Z');

  it('starts a month at revision 0 when no version carries this month’s prefix', () => {
    expect(nextTrainVersion(['3.0.0', '1.2.3'], october)).toBe('26.10.0');
  });

  it('starts at revision 0 for an empty version list', () => {
    expect(nextTrainVersion([], october)).toBe('26.10.0');
  });

  it('advances the revision when a train already shipped this month', () => {
    expect(nextTrainVersion(['26.10.0', '26.10.0', '3.0.0'], october)).toBe('26.10.1');
  });

  it('uses the highest revision already stamped this month', () => {
    expect(nextTrainVersion(['26.10.0', '26.10.4'], october)).toBe('26.10.5');
  });

  it('ignores versions that only share a numeric prefix or carry a suffix', () => {
    expect(nextTrainVersion(['26.10.0-beta', '26.100.0', '26.1.0'], october)).toBe('26.10.0');
  });

  it('rolls into a new month at revision 0', () => {
    expect(nextTrainVersion(['26.10.4'], new Date('2026-11-20T12:00:00Z'))).toBe('26.11.0');
  });

  it('pads single-digit months and keeps the two-digit year', () => {
    expect(nextTrainVersion(['26.10.4'], new Date('2027-03-05T12:00:00Z'))).toBe('27.03.0');
  });
});
