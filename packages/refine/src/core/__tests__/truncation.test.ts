import { applyTruncationReveal, truncationRevealRef } from '../truncation';

/**
 * jsdom reports zero for scrollWidth/clientWidth, so clipping is simulated by
 * defining the geometry properties directly. (ResizeObserver is likewise absent,
 * which exercises the helper's no-observer path: sync runs once at wire time.)
 */
const setBox = (el: HTMLElement, { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }): void => {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
};

describe('applyTruncationReveal', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
  });

  it('mirrors the full text into title while the element is clipped', () => {
    host = document.createElement('div');
    host.textContent = '  A   label   that   is   clipped  ';
    document.body.append(host);
    setBox(host, { clientWidth: 50, scrollWidth: 200 });

    const { detach } = applyTruncationReveal(host);

    expect(host.getAttribute('title')).toBe('A label that is clipped');
    detach();
  });

  it('leaves title absent while the element fits', () => {
    host = document.createElement('div');
    host.textContent = 'Short';
    document.body.append(host);
    setBox(host, { clientWidth: 200, scrollWidth: 200 });

    const { detach } = applyTruncationReveal(host);

    expect(host.hasAttribute('title')).toBe(false);
    detach();
  });

  it('reads slotted light-DOM text, not the shadow wrapper’s own content', () => {
    host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const label = document.createElement('span');
    const slot = document.createElement('slot');

    label.append(slot);
    root.append(label);
    host.append(document.createTextNode('Slotted label text'));
    document.body.append(host);
    setBox(label, { clientWidth: 20, scrollWidth: 120 });

    const { detach } = applyTruncationReveal(label, { slot });

    expect(label.getAttribute('title')).toBe('Slotted label text');
    detach();
  });

  it('drops a previously set title once the element fits again', () => {
    host = document.createElement('div');
    host.textContent = 'Text';
    document.body.append(host);
    setBox(host, { clientWidth: 50, scrollWidth: 200 });

    const handle = applyTruncationReveal(host);

    expect(host.getAttribute('title')).toBe('Text');

    setBox(host, { clientWidth: 200, scrollWidth: 200 });
    handle.sync();

    expect(host.hasAttribute('title')).toBe(false);
    handle.detach();
  });
});

describe('truncationRevealRef', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
  });

  it('applies the reveal on mount and clears it after unmount', () => {
    host = document.createElement('div');
    host.textContent = 'Clipped label';
    document.body.append(host);
    setBox(host, { clientWidth: 10, scrollWidth: 100 });

    const revealRef = truncationRevealRef();

    revealRef(host);
    expect(host.getAttribute('title')).toBe('Clipped label');

    revealRef(null);
    // Detached: the title the helper owned is removed, and re-syncing does nothing.
    expect(host.hasAttribute('title')).toBe(false);
  });

  it('replaces the previous element’s wiring when re-invoked', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');

    first.textContent = 'First';
    second.textContent = 'Second';
    document.body.append(first, second);
    setBox(first, { clientWidth: 10, scrollWidth: 100 });
    setBox(second, { clientWidth: 10, scrollWidth: 100 });

    const revealRef = truncationRevealRef();

    revealRef(first);
    expect(first.getAttribute('title')).toBe('First');

    revealRef(second);

    // Only one element is ever wired: taking over detaches the old one, whose
    // owned title is cleared, and wires the new one.
    expect(first.hasAttribute('title')).toBe(false);
    expect(second.getAttribute('title')).toBe('Second');

    revealRef(null);
    expect(second.hasAttribute('title')).toBe(false);
    host = first;
  });
});
