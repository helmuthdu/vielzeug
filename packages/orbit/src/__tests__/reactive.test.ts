import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createReactivePositioner } from '../reactive';
import { createDomRect, makeElements, setViewport } from './helpers';

describe('createReactivePositioner', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('publishes positions after start and cleans up', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const positioner = createReactivePositioner(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(positioner.position.value).toMatchObject({ placement: 'bottom', x: 210, y: 340 });

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 40, width: 100, x: 0, y: 0 }));
    positioner.update();

    expect(positioner.position.value).toMatchObject({ x: 10, y: 40 });
    positioner.dispose();
    expect(positioner.disposed).toBe(true);
  });
});
