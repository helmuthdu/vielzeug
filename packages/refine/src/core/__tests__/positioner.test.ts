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

/**
 * `floating`'s rect reflects whatever `style.left`/`style.top` was last written, offset by
 * `driftX`/`driftY` (default `0`) — jsdom doesn't lay out `position: fixed` for real, so without
 * this the positioner's own measure-after-write self-correction step (see `positioner.ts`) would
 * treat every unmocked coordinate as "wrong" and double up the just-written offset. A non-zero
 * drift simulates the real-world case that correction step exists for: some ancestor making the
 * browser render the element somewhere other than the `left`/`top` `computePosition()` wrote.
 */
function mockDynamicFloatingRect(floating: HTMLElement, { driftX = 0, driftY = 0 } = {}): void {
  vi.spyOn(floating, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        bottom: 0,
        height: 20,
        left: (Number.parseFloat(floating.style.left) || 0) + driftX,
        right: 0,
        toJSON: () => ({}),
        top: (Number.parseFloat(floating.style.top) || 0) + driftY,
        width: 50,
        x: (Number.parseFloat(floating.style.left) || 0) + driftX,
        y: (Number.parseFloat(floating.style.top) || 0) + driftY,
      }) as DOMRect,
  );
}

/**
 * Simulates a floating element mid-entrance-transition: `getBoundingClientRect()` reflects the
 * just-written `style.left`/`style.top` plus `ownTransformOffsetY`, *unless* `style.transform`
 * has been explicitly neutralized to `'none'` — mirroring how a real `transform: translateY(...)`
 * (dropdowns/popovers here all use one, driven by `[data-open]` + `@starting-style`, still
 * reflecting its starting offset for a moment right at open) affects `getBoundingClientRect()`
 * until something clears it.
 */
function mockOwnTransformDrift(floating: HTMLElement, ownTransformOffsetY: number): void {
  vi.spyOn(floating, 'getBoundingClientRect').mockImplementation(() => {
    const ownOffset = floating.style.transform === 'none' ? 0 : ownTransformOffsetY;

    return {
      bottom: 0,
      height: 20,
      left: Number.parseFloat(floating.style.left) || 0,
      right: 0,
      toJSON: () => ({}),
      top: (Number.parseFloat(floating.style.top) || 0) + ownOffset,
      width: 50,
      x: Number.parseFloat(floating.style.left) || 0,
      y: (Number.parseFloat(floating.style.top) || 0) + ownOffset,
    } as DOMRect;
  });
}

function makeElements(driftOptions?: { driftX?: number; driftY?: number }) {
  const reference = document.createElement('button');
  const floating = document.createElement('div');

  floating.style.position = 'fixed';
  document.body.appendChild(reference);
  document.body.appendChild(floating);

  // Distinct, non-zero sizes so `bottom-start` and `bottom-end` resolve to different `x`.
  mockRect(reference, { height: 20, width: 100, x: 100, y: 50 });
  mockDynamicFloatingRect(floating, driftOptions);

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

// ── Containing-block self-correction ─────────────────────────────────────────
//
// Regression coverage for the bug this exists to fix: `ore-select`'s dropdown, positioned
// inside a dialog whose panel has a permanent (visually-identity) `transform`, silently
// mispositioned once `left`/`top` got resolved against that panel's box instead of the
// viewport `computePosition()` assumed. Detecting the trapping ancestor analytically and
// pre-subtracting its rect (via orbit's `getContainingBlock()`) turned out to be unreliable —
// some elements in the exact same subtree needed the correction and some didn't. These tests
// pin down the measure-after-write correction that replaced it instead.

describe('containing-block self-correction', () => {
  it('leaves the written position alone when the browser rendered it exactly where asked', () => {
    const { cleanup, floating, reference } = makeElements(); // no drift — the common case

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    expect(floating.style.left).toBe('100px');

    cleanup();
  });

  it('corrects the written position when an ancestor traps it elsewhere on the x axis', () => {
    // Simulates a containing-block ancestor whose own left offset is 400px: writing `left: 100px`
    // would actually render at x=500 (100 + 400) without the correction.
    const { cleanup, floating, reference } = makeElements({ driftX: 400 });

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    // Corrected write: 100 - 400 = -300, so the drifted render lands back at the intended x=100.
    expect(floating.style.left).toBe('-300px');
    expect(floating.getBoundingClientRect().x).toBe(100);

    cleanup();
  });

  it('corrects the written position when an ancestor traps it elsewhere on the y axis', () => {
    const { cleanup, floating, reference } = makeElements({ driftY: -60 });

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    // reference: y=50, height=20 → intended top = 70. Corrected write: 70 - (-60) = 130.
    expect(floating.style.top).toBe('130px');
    expect(floating.getBoundingClientRect().y).toBe(70);

    cleanup();
  });

  // Regression test for a real bug this measurement approach introduced: `ore-select`'s own
  // dropdown-open entrance transition (`transform: translateY(...)` driven by `[data-open]` +
  // `@starting-style`) was being misread as a permanent ancestor-driven mismatch and baked in as
  // a lasting offset — meaning every dropdown opened slightly mispositioned relative to its
  // options, which is exactly the kind of drift that makes clicks land on the wrong element.
  it("does not mistake the floating element's own entrance-transition transform for an ancestor-driven mismatch", () => {
    const reference = document.createElement('button');
    const floating = document.createElement('div');

    floating.style.position = 'fixed';
    document.body.appendChild(reference);
    document.body.appendChild(floating);
    mockRect(reference, { height: 20, width: 100, x: 100, y: 50 });
    // Own entrance-transition offset only — no ancestor-driven drift at all.
    mockOwnTransformDrift(floating, -4);

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    pos.update();

    // reference: y=50, height=20 → intended top = 70. Must stay exactly 70 — the own-transform
    // offset must be neutralized for the measurement, not corrected for as if it were real drift.
    expect(floating.style.top).toBe('70px');

    reference.remove();
    floating.remove();
  });
});
