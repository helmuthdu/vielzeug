import { vi } from 'vitest';

import type { MiddlewareState } from '../types';

// ── DOM rect helpers ──────────────────────────────────────────────────────────

type RectInit = { height?: number; width?: number; x?: number; y?: number };

export function createDomRect(init: RectInit = {}): DOMRect {
  const x = init.x ?? 0;
  const y = init.y ?? 0;
  const width = init.width ?? 0;
  const height = init.height ?? 0;

  return {
    bottom: y + height,
    height,
    left: x,
    right: x + width,
    toJSON: () => ({}),
    top: y,
    width,
    x,
    y,
  } as DOMRect;
}

// ── Element factories ─────────────────────────────────────────────────────────

export function makeElements(refInit: RectInit, floatInit: RectInit = {}) {
  const reference = document.createElement('div');
  const floating = document.createElement('div');

  vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect(refInit));
  vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect(floatInit));

  return { floating, reference };
}

export function makeArrow(init: RectInit = {}) {
  const element = document.createElement('div');

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createDomRect(init));

  return element;
}

export function makeVirtualReference(init: RectInit) {
  const rect = createDomRect(init);

  return {
    getBoundingClientRect: vi.fn(() => rect),
    getClientRects: vi.fn(() => [rect] as unknown as DOMRectList),
  };
}

// ── Viewport ──────────────────────────────────────────────────────────────────

export function setViewport(width = 1024, height = 768): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
      height,
      offsetLeft: 0,
      offsetTop: 0,
      removeEventListener: vi.fn(),
      width,
    },
  });
}

// ── MiddlewareState builder ───────────────────────────────────────────────────

export function withState(
  state: Partial<MiddlewareState> &
    Pick<MiddlewareState, 'elements' | 'initialPlacement' | 'placement' | 'rects' | 'x' | 'y'>,
): MiddlewareState {
  return { middlewareData: {}, ...state };
}
