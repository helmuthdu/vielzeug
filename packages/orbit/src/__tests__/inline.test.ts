import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computePosition } from '../index';
import { inline } from '../inline';
import { createDomRect, setViewport } from './helpers';

describe('inline', () => {
  beforeEach(() => setViewport());

  it('chooses the client rect containing the pointer', () => {
    const reference = document.createElement('span');
    const floating = document.createElement('div');
    const first = createDomRect({ height: 20, width: 50, x: 100, y: 100 });
    const second = createDomRect({ height: 20, width: 60, x: 200, y: 100 });

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 20, width: 160, x: 100, y: 100 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([first, second] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    const result = computePosition(reference, floating, {
      middleware: [inline({ x: 220, y: 110 })],
      placement: 'bottom',
    });

    expect(result.x).toBe(210);
    expect(result.y).toBe(120);
  });

  it('selects rect whose center is closest to the projected floating center', () => {
    const reference = document.createElement('span');
    const floating = document.createElement('div');
    const first = createDomRect({ height: 20, width: 50, x: 100, y: 100 });
    const second = createDomRect({ height: 20, width: 60, x: 200, y: 100 });

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 20, width: 160, x: 100, y: 100 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([first, second] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    // Without x/y, it picks the rect whose center is closest to the floating element's projected center
    const result = computePosition(reference, floating, {
      middleware: [inline()],
      placement: 'bottom',
    });

    expect(result.y).toBe(120); // bottom of one of the rects
  });

  it('is a no-op when the reference has only a single client rect', () => {
    const reference = document.createElement('span');
    const floating = document.createElement('div');

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 20, width: 100, x: 200, y: 300 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([
      createDomRect({ height: 20, width: 100, x: 200, y: 300 }),
    ] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    const withInline = computePosition(reference, floating, { middleware: [inline()], placement: 'bottom' });
    const withoutInline = computePosition(reference, floating, { placement: 'bottom' });

    expect(withInline.x).toBe(withoutInline.x);
    expect(withInline.y).toBe(withoutInline.y);
  });

  it('falls back gracefully when getClientRects returns an empty array', () => {
    const reference = document.createElement('span');
    const floating = document.createElement('div');

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 20, width: 100, x: 200, y: 300 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    // With zero client rects, inline is a no-op — same result as without inline.
    const withInline = computePosition(reference, floating, { middleware: [inline()], placement: 'bottom' });
    const withoutInline = computePosition(reference, floating, { placement: 'bottom' });

    expect(withInline.x).toBe(withoutInline.x);
    expect(withInline.y).toBe(withoutInline.y);
  });

  it('chooses the closest rect by y proximity for left/right placements', () => {
    // Two vertically-stacked rects: the bottom one is taller so its center is
    // closer to the float's projected y midpoint.
    const reference = document.createElement('span');
    const floating = document.createElement('div');
    const top = createDomRect({ height: 20, width: 60, x: 100, y: 100 });
    const bottom = createDomRect({ height: 40, width: 60, x: 100, y: 140 });

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 80, width: 60, x: 100, y: 100 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([top, bottom] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    const result = computePosition(reference, floating, {
      middleware: [inline()],
      placement: 'left',
    });

    // targetY = state.y + float.height/2 = (100+40-15) + 15 = 140
    // top center=110, dist=30; bottom center=160, dist=20 → bottom wins
    // final y = bottom.y + bottom.h/2 - float.h/2 = 140 + 20 - 15 = 145
    expect(result.y).toBe(145);
  });
});
