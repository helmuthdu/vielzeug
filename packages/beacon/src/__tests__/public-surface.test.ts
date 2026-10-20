import { BeaconConfigError, BeaconError, createTour, resolveTarget } from '../index';
import type { BeaconStorage } from '../types';

beforeEach(() => {
  document.body.innerHTML = '<div data-beacon="campaigns"></div>';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scrolling', () => {
  it('scrolls an anchored step into view when it activates', () => {
    const tour = createTour({
      autoScroll: true,
      id: 'scroller',
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();

    expect(window.scrollTo).toHaveBeenCalled();
    tour.dispose();
  });

  it('never scrolls when autoScroll is off', () => {
    const tour = createTour({
      autoScroll: false,
      id: 'still',
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();

    expect(window.scrollTo).not.toHaveBeenCalled();
    tour.dispose();
  });

  it('reads the sticky-header offset at scroll time', () => {
    const offset = vi.fn(() => 64);
    const tour = createTour({
      autoScroll: true,
      id: 'sticky',
      scrollOffset: offset,
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();

    expect(offset).toHaveBeenCalled();
    tour.dispose();
  });

  it('scrolls once per activation even when the header offset corrects the target', () => {
    const tour = createTour({
      autoScroll: true,
      id: 'single-scroll',
      scrollOffset: 64,
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();

    // A second smooth scrollTo would interrupt the first mid-flight; the
    // correction must be computed before the single call.
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    tour.dispose();
  });
});

describe('live target tracking', () => {
  it("drops the rect when the active step's target leaves the document", async () => {
    const tour = createTour({
      autoScroll: false,
      id: 'ghost',
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();
    expect(tour.current.peek().rect).not.toBeNull();

    document.body.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(tour.current.peek().rect).toBeNull();
    tour.dispose();
  });

  it('re-anchors when the target returns to the document', async () => {
    const tour = createTour({
      autoScroll: false,
      id: 'returner',
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();

    document.body.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tour.current.peek().rect).toBeNull();

    document.body.innerHTML = '<div data-beacon="campaigns"></div>';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(tour.current.peek().rect).not.toBeNull();
    tour.dispose();
  });

  it('re-publishes the rect when a scroll moves the target', async () => {
    document.body.innerHTML = '<div data-beacon="campaigns"></div>';
    const tour = createTour({
      autoScroll: false,
      id: 'scroll-follow',
      steps: [{ id: 'campaigns', target: '[data-beacon="campaigns"]' }],
    });
    tour.start();
    const before = tour.current.peek().rect;

    // jsdom cannot scroll, so move the element under the selector instead and
    // fire the event the listener is built for.
    const move = document.querySelector('[data-beacon="campaigns"]') as HTMLElement;

    move.getBoundingClientRect = () => ({ height: 10, width: 10, x: 0, y: -240 }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(tour.current.peek().rect).not.toEqual(before);
    expect(tour.current.peek().rect?.y).toBe(-240);
    tour.dispose();
  });
});

describe('tap lifecycle', () => {
  it('detaches a tapper when its signal aborts', () => {
    const tour = createTour({ autoScroll: false, id: 'tapper', steps: [{ id: 'a' }] });
    const seen: string[] = [];
    const controller = new AbortController();
    tour.tap((event) => seen.push(event.type), { signal: controller.signal });

    tour.start();
    controller.abort();
    tour.next();

    expect(seen).toEqual(['status-change', 'step:start']);
    tour.dispose();
  });

  it('swallows a throwing handler so the tour keeps working', () => {
    const tour = createTour({ autoScroll: false, id: 'thrower', steps: [{ id: 'a' }, { id: 'b' }] });
    tour.tap(() => {
      throw new Error('observer blew up');
    });

    expect(() => tour.start()).not.toThrow();
    expect(tour.status.peek()).toBe('active');
    tour.dispose();
  });
});

describe('storage contract', () => {
  it('namespaces the storage key by tour id', () => {
    const get = vi.fn(() => undefined);
    const storage: BeaconStorage = { get, remove: () => {}, set: () => {} };

    createTour({ autoScroll: false, id: 'welcome', steps: [{ id: 'a' }], storage });

    expect(get).toHaveBeenCalledWith('@vielzeug/beacon:welcome');
  });

  it('surfaces a throwing storage as a warning through tap, not a crash', () => {
    const storage: BeaconStorage = {
      get: () => undefined,
      remove: () => {},
      set: () => {
        throw new Error('quota');
      },
    };
    const tour = createTour({ autoScroll: false, id: 'quota', steps: [{ id: 'a' }], storage });
    const warnings: string[] = [];
    tour.tap((event) => {
      if (event.type === 'warning') warnings.push(event.message);
    });

    expect(() => tour.start()).not.toThrow();
    expect(warnings).toContain('quota');
    tour.dispose();
  });
});

describe('errors', () => {
  it('routes every config failure through the BeaconError hierarchy', () => {
    try {
      createTour({ id: 'bad', steps: [] });
      throw new Error('unreachable');
    } catch (error) {
      expect(error).toBeInstanceOf(BeaconConfigError);
      expect(error).toBeInstanceOf(BeaconError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('names the error class on the instance', () => {
    const error = new BeaconConfigError('boom');

    expect(error.name).toBe('BeaconConfigError');
    expect(error.message).toBe('boom');
  });
});

describe('resolveTarget', () => {
  it('resolves a selector to a viewport-space rect', () => {
    document.body.innerHTML = '<div data-beacon="campaigns"></div>';

    expect(resolveTarget('[data-beacon="campaigns"]')).toEqual({ height: 0, width: 0, x: 0, y: 0 });
  });

  it('returns null for a target that is not in the document', () => {
    expect(resolveTarget('#missing')).toBeNull();
  });

  it('passes a plain rect through unchanged', () => {
    const source = { height: 4, width: 2, x: 1, y: 3 };

    expect(resolveTarget(source)).toBe(source);
  });

  it('resolves a resolver that returns an element', () => {
    document.body.innerHTML = '<div id="anchor"></div>';
    const anchor = document.querySelector('#anchor') as Element;

    expect(resolveTarget(() => anchor)).not.toBeNull();
  });
});
