import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDropdownPositioner } from '../positioner';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stubs `getBoundingClientRect()` so placement math is deterministic in jsdom. */
function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    ...rect,
  });
}

function makeElements() {
  const reference = document.createElement('button');
  const floating = document.createElement('div');

  floating.style.position = 'fixed';
  document.body.appendChild(reference);
  document.body.appendChild(floating);

  // Distinct, non-zero sizes so `bottom-start` and `bottom-end` resolve to different `x`.
  mockRect(reference, { height: 20, width: 100, x: 100, y: 50 });
  mockRect(floating, { height: 20, width: 50 });

  return {
    cleanup: () => {
      reference.remove();
      floating.remove();
    },
    floating,
    reference,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createDropdownPositioner()', () => {
  it('exposes the correct floating and reference accessors', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getReference: () => reference,
    });

    expect(pos.floating()).toBe(floating);
    expect(pos.reference()).toBe(reference);

    cleanup();
  });

  it('update() is a no-op when reference or floating is null', () => {
    const pos = createDropdownPositioner({
      getFloating: () => null,
      getReference: () => null,
    });

    expect(() => pos.update()).not.toThrow();
  });

  it('startAutoUpdate() returns a stop function and does not throw when elements are null', () => {
    const pos = createDropdownPositioner({
      getFloating: () => null,
      getReference: () => null,
    });

    const stop = pos.startAutoUpdate?.();

    expect(typeof stop).toBe('function');
    expect(() => stop?.()).not.toThrow();
  });

  it('exposes startAutoUpdate as a function', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getReference: () => reference,
    });

    expect(typeof pos.startAutoUpdate).toBe('function');

    cleanup();
  });
});

// ── RTL placement mirroring ───────────────────────────────────────────────────

describe('RTL placement mirroring (via getDir)', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('mirrors bottom-start to bottom-end in RTL (x moves from reference.x to reference.right - floating.width)', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getDir: () => 'rtl',
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    // reference: x=100 width=100 → right=200; floating width=50 → mirrored x = 200 - 50 = 150
    expect(floating.style.left).toBe('150px');

    cleanup();
  });

  it('mirrors bottom-end to bottom-start in RTL (x moves back to reference.x)', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getDir: () => 'rtl',
      getFloating: () => floating,
      getPlacement: () => 'bottom-end',
      getReference: () => reference,
    });

    pos.update();

    expect(floating.style.left).toBe('100px');

    cleanup();
  });

  it('leaves non-start/end placements unchanged in RTL', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getDir: () => 'rtl',
      getFloating: () => floating,
      getPlacement: () => 'bottom',
      getReference: () => reference,
    });

    pos.update();

    // 'bottom' is center-aligned and has no start/end to mirror: x = ref.x + (ref.width - floating.width) / 2
    expect(floating.style.left).toBe('125px');

    cleanup();
  });

  it('does not mirror placement in LTR (default)', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    expect(floating.style.left).toBe('100px');

    cleanup();
  });

  it('derives direction automatically from the reference element when getDir is omitted', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    expect(floating.style.left).toBe('100px'); // no dir anywhere → resolves to 'ltr', unmirrored

    document.documentElement.setAttribute('dir', 'rtl');
    pos.update();

    expect(floating.style.left).toBe('150px'); // <html dir="rtl"> → resolves to 'rtl', mirrored

    cleanup();
  });

  it('an explicit getDir overrides the reference element ancestry', () => {
    const { cleanup, floating, reference } = makeElements();

    document.documentElement.setAttribute('dir', 'rtl');

    const pos = createDropdownPositioner({
      getDir: () => 'ltr',
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    expect(floating.style.left).toBe('100px');

    cleanup();
  });
});
