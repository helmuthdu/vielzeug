import { describe, expect, it } from 'vitest';
import { WireConfigError } from '../errors.js';
import { portAnchor } from '../ports.js';

const rect = { height: 64, width: 160, x: 100, y: 50 };

describe('portAnchor', () => {
  it('places ports on each side at the offset fraction', () => {
    expect(portAnchor(rect, 'top', 0.25)).toEqual({ side: 'top', x: 140, y: 50 });
    expect(portAnchor(rect, 'right')).toEqual({ side: 'right', x: 260, y: 82 });
    expect(portAnchor(rect, 'bottom', 1)).toEqual({ side: 'bottom', x: 260, y: 114 });
    expect(portAnchor(rect, 'left', 0)).toEqual({ side: 'left', x: 100, y: 50 });
  });

  it('defaults to the middle of the side', () => {
    expect(portAnchor(rect, 'left')).toEqual({ side: 'left', x: 100, y: 82 });
  });

  it('rejects offsets outside 0..1', () => {
    expect(() => portAnchor(rect, 'top', 1.5)).toThrow(WireConfigError);
    expect(() => portAnchor(rect, 'top', Number.NaN)).toThrow(WireConfigError);
  });
});
