import { describe, expect, it } from 'vitest';

import { createDropdownPositioner } from '../positioner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeElements() {
  const reference = document.createElement('button');
  const floating = document.createElement('div');

  floating.style.position = 'fixed';
  document.body.appendChild(reference);
  document.body.appendChild(floating);

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
  it('mirrors bottom-start to bottom-end in RTL', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getDir: () => 'rtl',
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    expect(() => pos.update()).not.toThrow();

    cleanup();
  });

  it('mirrors bottom-end to bottom-start in RTL', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getDir: () => 'rtl',
      getFloating: () => floating,
      getPlacement: () => 'bottom-end',
      getReference: () => reference,
    });

    expect(() => pos.update()).not.toThrow();

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

    expect(() => pos.update()).not.toThrow();

    cleanup();
  });

  it('does not mirror placement in LTR (default)', () => {
    const { cleanup, floating, reference } = makeElements();

    const pos = createDropdownPositioner({
      getFloating: () => floating,
      getPlacement: () => 'bottom-start',
      getReference: () => reference,
    });

    expect(() => pos.update()).not.toThrow();

    cleanup();
  });
});
