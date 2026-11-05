import { describe, expect, it } from 'vitest';
import { FLING_PROJECTION_SECONDS, projectFling } from '../shared/fling';

describe('projectFling', () => {
  it('extends the release position by the velocity-implied distance', () => {
    expect(projectFling(20, 2000)).toBe(20 + 2000 * FLING_PROJECTION_SECONDS);
  });

  it('pulls the projection back for a counter-flick', () => {
    expect(projectFling(100, -800)).toBe(100 - 800 * FLING_PROJECTION_SECONDS);
  });

  it('is the identity without velocity', () => {
    expect(projectFling(48, 0)).toBe(48);
  });

  it('accepts a custom projection horizon', () => {
    expect(projectFling(0, 1000, 0.1)).toBeCloseTo(100);
  });
});
