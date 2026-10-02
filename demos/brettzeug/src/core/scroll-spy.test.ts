// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { observeActiveSections } from './scroll-spy';

type IoEntry = { isIntersecting: boolean; target: Element };
type IoCallback = (entries: IoEntry[]) => void;

const observers: { callback: IoCallback; rootMargin?: string; targets: Set<Element> }[] = [];

class FakeIntersectionObserver {
  constructor(callback: IoCallback, options?: { rootMargin?: string }) {
    this._record = { callback, rootMargin: options?.rootMargin, targets: new Set() };
    observers.push(this._record);
  }
  private _record: { callback: IoCallback; rootMargin?: string; targets: Set<Element> };
  observe(element: Element): void {
    this._record.targets.add(element);
  }
  unobserve(): void {}
  disconnect(): void {
    this._record.targets.clear();
  }
}

/** Fire an intersection event for `element` on every observer watching it. */
function intersect(element: Element, isIntersecting: boolean): void {
  for (const record of observers) {
    if (record.targets.has(element)) record.callback([{ isIntersecting, target: element }]);
  }
}

const markup = `
  <nav>
    <a data-scroll-link href="#areas">Build</a>
    <ore-navbar-item href="#work">Work</ore-navbar-item>
    <ore-navbar-item href="#work" slot="mobile-menu">Work</ore-navbar-item>
    <ore-navbar-item href="#about">About</ore-navbar-item>
    <ore-navbar-item href="https://example.com">Vielzeug</ore-navbar-item>
  </nav>
  <section id="work"></section>
  <section id="about"></section>
  <section id="areas"></section>
`;

let cleanup: (() => void) | undefined;

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  document.body.innerHTML = markup;
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
  document.body.innerHTML = '';
});

describe('observeActiveSections', () => {
  it('marks every navbar item for the intersecting section active', () => {
    cleanup = observeActiveSections(document);
    const [workDesktop, workMobile] = [...document.querySelectorAll('ore-navbar-item[href="#work"]')];
    const about = document.querySelector('ore-navbar-item[href="#about"]');

    intersect(document.getElementById('work') as HTMLElement, true);
    expect(workDesktop.getAttribute('active')).toBe('');
    expect(workMobile.getAttribute('active')).toBe('');
    expect(about?.hasAttribute('active')).toBe(false);

    intersect(document.getElementById('about') as HTMLElement, true);
    expect(workDesktop.hasAttribute('active')).toBe(false);
    expect(workMobile.hasAttribute('active')).toBe(false);
    expect(about?.getAttribute('active')).toBe('');
  });

  it('marks the mobile dock location with aria-current', () => {
    cleanup = observeActiveSections(document);
    const dockLink = document.querySelector('[data-scroll-link][href="#areas"]');
    intersect(document.getElementById('areas') as HTMLElement, true);
    expect(dockLink?.getAttribute('aria-current')).toBe('location');
  });

  it('does not let a leaving section clear a newer active section', () => {
    cleanup = observeActiveSections(document);
    const work = document.getElementById('work') as HTMLElement;
    const about = document.getElementById('about') as HTMLElement;
    const aboutItem = document.querySelector('ore-navbar-item[href="#about"]');

    intersect(work, true);
    intersect(about, true);
    // work's leave event arrives after about claimed the flag.
    intersect(work, false);
    expect(aboutItem?.getAttribute('active')).toBe('');
  });

  it('clears the flag when the active section leaves the line', () => {
    cleanup = observeActiveSections(document);
    const work = document.getElementById('work') as HTMLElement;
    const workItem = document.querySelector('ore-navbar-item[href="#work"]');

    intersect(work, true);
    intersect(work, false);
    expect(workItem?.hasAttribute('active')).toBe(false);
  });

  it('rebuilds a pixel-based observation line when the viewport is resized', () => {
    cleanup = observeActiveSections(document);
    expect(observers[0].rootMargin).toBe('-345px 0px -422px 0px');

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    window.dispatchEvent(new Event('resize'));

    expect(observers[0].targets.size).toBe(0);
    expect(observers[3].rootMargin).toBe('-405px 0px -494px 0px');
  });

  it('ignores external links and disposes observers on cleanup', () => {
    cleanup = observeActiveSections(document);
    expect(document.querySelector('ore-navbar-item[href^="https"]')?.hasAttribute('active')).toBe(false);
    cleanup();
    cleanup = undefined;
    for (const record of observers) expect(record.targets.size).toBe(0);
  });

  it('stays inert when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    cleanup = observeActiveSections(document);
    expect(document.querySelector('ore-navbar-item')?.hasAttribute('active')).toBe(false);
  });
});
