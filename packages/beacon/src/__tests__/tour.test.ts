import { BeaconConfigError, BeaconDisposedError, createTour } from '../index';
import type { BeaconProgress, BeaconStorage, BeaconTourConfig, BeaconTourEvent } from '../types';

function createTestStorage(): BeaconStorage & { records: Map<string, BeaconProgress> } {
  const records = new Map<string, BeaconProgress>();

  return {
    get: (key) => records.get(key),
    records,
    remove: (key) => {
      records.delete(key);
    },
    set: (key, value) => {
      records.set(key, { ...value });
    },
  };
}

const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'campaigns', target: '[data-beacon="campaigns"]', title: 'Campaigns' },
  { id: 'builds', target: '[data-beacon="builds"]', title: 'Builds' },
];

const tourConfig = (overrides: Partial<BeaconTourConfig> = {}): BeaconTourConfig => ({
  id: 'first-visit',
  steps,
  ...overrides,
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.body.innerHTML = '';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createTour configuration', () => {
  it('rejects a tour without steps', () => {
    expect(() => createTour({ id: 'empty', steps: [] })).toThrow(BeaconConfigError);
  });

  it('rejects duplicate step ids', () => {
    expect(() =>
      createTour({
        id: 'dupes',
        steps: [{ id: 'a' }, { id: 'a' }],
      }),
    ).toThrow(/duplicate step id "a"/);
  });

  it('rejects an empty tour id', () => {
    expect(() => createTour({ id: '', steps })).toThrow(BeaconConfigError);
  });
});

describe('tour navigation', () => {
  it('publishes the first step when started', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();

    expect(tour.current.peek().step?.id).toBe('welcome');
    expect(tour.current.peek().stepIndex).toBe(0);
    expect(tour.status.peek()).toBe('active');
    tour.dispose();
  });

  it('advances with next and reports step transitions through tap', () => {
    document.body.innerHTML = '<div data-beacon="campaigns"></div><div data-beacon="builds"></div>';
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.next();

    expect(tour.current.peek().step?.id).toBe('campaigns');
    expect(events.map((event) => event.type)).toEqual(['status-change', 'step:start', 'step:complete', 'step:start']);
    tour.dispose();
  });

  it('completes the tour when next passes the last step', () => {
    document.body.innerHTML = '<div data-beacon="campaigns"></div><div data-beacon="builds"></div>';
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.goto(2);
    tour.next();

    expect(tour.status.peek()).toBe('completed');
    expect(tour.current.peek().step).toBeNull();
    expect(events).toContainEqual({ reason: 'finish', type: 'tour:complete' });
    tour.dispose();
  });

  it('stays on the first step when back is pressed there', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.back();

    expect(tour.current.peek().stepIndex).toBe(0);
    tour.dispose();
  });

  it('jumps to a step by id', () => {
    document.body.innerHTML = '<div data-beacon="builds"></div>';
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.goto('builds');

    expect(tour.current.peek().step?.id).toBe('builds');
    tour.dispose();
  });

  it('warns and stays put when goto names an unknown step', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.goto('nope');

    expect(tour.current.peek().step?.id).toBe('welcome');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/beacon]'));
    tour.dispose();
  });
});

describe('tour endings', () => {
  it('skip ends the tour and reports the skip reason', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.skip();

    expect(tour.status.peek()).toBe('dismissed');
    expect(events).toContainEqual({ reason: 'skip', type: 'tour:complete' });
    tour.dispose();
  });

  it('dismiss ends the tour with a dismiss event', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.dismiss();

    expect(tour.status.peek()).toBe('dismissed');
    expect(events).toContainEqual({ type: 'tour:dismiss' });
    tour.dispose();
  });

  it('start after skip does not reopen a dismissed tour', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.skip();
    tour.start();

    expect(tour.status.peek()).toBe('dismissed');
    expect(tour.current.peek().step).toBeNull();
    tour.dispose();
  });
});

describe('persistence', () => {
  it('a dismissed tour is not eligible on the next visit', () => {
    const storage = createTestStorage();
    const first = createTour(tourConfig({ autoScroll: false, storage }));
    first.start();
    first.skip();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false, storage }));
    expect(second.eligible.peek()).toBe(false);
    expect(second.status.peek()).toBe('dismissed');
    second.dispose();
  });

  it('a completed tour is not eligible on the next visit', () => {
    const storage = createTestStorage();
    const first = createTour(tourConfig({ autoScroll: false, storage }));
    first.start();
    first.finish();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false, storage }));
    expect(second.eligible.peek()).toBe(false);
    second.dispose();
  });

  it('a newer version makes a completed tour eligible again', () => {
    const storage = createTestStorage();
    const first = createTour(tourConfig({ autoScroll: false, storage, version: 1 }));
    first.start();
    first.finish();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false, storage, version: 2 }));
    expect(second.eligible.peek()).toBe(true);
    second.dispose();
  });

  it('a paused tour resumes at its stored step', async () => {
    const storage = createTestStorage();
    document.body.innerHTML = '<div data-beacon="campaigns"></div>';
    const first = createTour(tourConfig({ autoScroll: false, storage }));
    first.start();
    await settle();
    first.goto('campaigns');
    first.pause();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false, storage }));
    expect(second.status.peek()).toBe('paused');
    expect(second.eligible.peek()).toBe(true);
    second.start();
    expect(second.current.peek().step?.id).toBe('campaigns');
    second.dispose();
  });

  it('reset clears persisted progress so the tour is offered again', () => {
    const storage = createTestStorage();
    const first = createTour(tourConfig({ autoScroll: false, storage }));
    first.start();
    first.finish();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false, storage }));
    expect(second.eligible.peek()).toBe(false);
    second.reset();
    expect(second.eligible.peek()).toBe(true);
    expect(storage.records.size).toBe(0);
    second.dispose();
  });

  it('ignores a corrupt stored record', () => {
    const storage: BeaconStorage = {
      get: () => ({ status: 'not-a-status', stepIndex: 99 }) as unknown as BeaconProgress,
      remove: () => {},
      set: () => {},
    };
    const tour = createTour(tourConfig({ autoScroll: false, storage }));

    expect(tour.eligible.peek()).toBe(true);
    tour.dispose();
  });

  it('loads progress from an async storage', async () => {
    const persisted: BeaconProgress = { status: 'completed', stepIndex: 2, version: 1 };
    const tour = createTour(
      tourConfig({
        autoScroll: false,
        storage: { get: async () => persisted, remove: async () => {}, set: async () => {} },
      }),
    );
    await settle();

    expect(tour.eligible.peek()).toBe(false);
    expect(tour.status.peek()).toBe('completed');
    tour.dispose();
  });

  it('keeps progress in memory only when no storage is configured', () => {
    const first = createTour(tourConfig({ autoScroll: false }));
    first.start();
    first.finish();
    first.dispose();

    const second = createTour(tourConfig({ autoScroll: false }));
    expect(second.eligible.peek()).toBe(true);
    second.dispose();
  });
});

describe('autoStart', () => {
  it('starts an eligible tour on the next microtask', async () => {
    const tour = createTour(tourConfig({ autoScroll: false, autoStart: true }));
    expect(tour.current.peek().step).toBeNull();
    await settle();

    expect(tour.status.peek()).toBe('active');
    expect(tour.current.peek().step?.id).toBe('welcome');
    tour.dispose();
  });

  it('does not start a tour whose stored record says completed', async () => {
    const storage = createTestStorage();
    storage.records.set('@vielzeug/beacon:first-visit', { status: 'completed', stepIndex: 2, version: 1 });
    const tour = createTour(tourConfig({ autoScroll: false, autoStart: true, storage }));
    await settle();

    expect(tour.status.peek()).toBe('completed');
    tour.dispose();
  });
});

describe('target waiting', () => {
  it("reports target-waiting while a step's target is absent", () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.next();

    expect(events).toContainEqual({
      index: 1,
      message: 'Waiting for step "campaigns" to become visible.',
      step: steps[1],
      type: 'target-waiting',
    });
    tour.dispose();
  });

  it('keeps the previous step visible until a missing target appears', async () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.next();

    expect(tour.current.peek().step?.id).toBe('welcome');

    document.body.innerHTML = '<div data-beacon="campaigns"></div>';
    await settle();

    expect(tour.current.peek().step?.id).toBe('campaigns');
    tour.dispose();
  });

  it('skips a step whose target never appears within the timeout', async () => {
    document.body.innerHTML = '<div data-beacon="builds"></div>';
    vi.useFakeTimers();
    const tour = createTour(tourConfig({ autoScroll: false, targetTimeoutMs: 1000 }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));

    tour.start();
    tour.next();
    vi.advanceTimersByTime(1000);

    expect(events.some((event) => event.type === 'target-missing')).toBe(true);
    expect(tour.current.peek().step?.id).toBe('builds');
    tour.dispose();
    vi.useRealTimers();
  });

  it('finishes when the last step times out waiting for its target', () => {
    vi.useFakeTimers();
    const tour = createTour(tourConfig({ autoScroll: false, targetTimeoutMs: 500 }));
    tour.start();
    tour.goto(2);
    vi.advanceTimersByTime(500);

    expect(tour.status.peek()).toBe('completed');
    tour.dispose();
    vi.useRealTimers();
  });

  it('shows the step unanchored when the timeout is zero', () => {
    const tour = createTour(tourConfig({ autoScroll: false, targetTimeoutMs: 0 }));
    tour.start();
    tour.next();

    expect(tour.current.peek().step?.id).toBe('campaigns');
    expect(tour.current.peek().rect).toBeNull();
    tour.dispose();
  });

  it('anchors a rect target without any DOM', () => {
    const tour = createTour(
      tourConfig({
        autoScroll: false,
        steps: [{ id: 'canvas', target: { height: 100, width: 200, x: 10, y: 20 }, title: 'Canvas' }],
      }),
    );
    tour.start();

    expect(tour.current.peek().rect).toEqual({ height: 100, width: 200, x: 10, y: 20 });
    tour.dispose();
  });

  it('resolves a resolver target when the step activates', () => {
    document.body.innerHTML = '<button id="create-build"></button>';
    const button = document.querySelector('#create-build') as HTMLElement;
    const tour = createTour(
      tourConfig({
        autoScroll: false,
        steps: [{ id: 'lazy', target: () => button, title: 'Lazy' }],
      }),
    );
    tour.start();

    expect(tour.current.peek().step?.id).toBe('lazy');
    expect(tour.current.peek().rect).toEqual({ height: 0, width: 0, x: 0, y: 0 });
    tour.dispose();
  });

  it('refreshes the rect when the target layout changes without scroll or resize', () => {
    // jsdom has no ResizeObserver: install a controllable stub so the layout
    // watch can be fired by hand, the way a real reflow (added content, grid
    // reflow) would fire it in a browser.
    const observers: Array<{ trigger: () => void }> = [];
    const NativeRO = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        observers.push({ trigger: () => this.callback([], this as unknown as ResizeObserver) });
      }
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    } as unknown as typeof ResizeObserver;

    try {
      document.body.innerHTML = '<div data-beacon="campaigns"></div>';
      const target = document.querySelector('[data-beacon="campaigns"]') as HTMLElement;
      const tour = createTour(tourConfig({ autoScroll: false }));
      tour.start();
      tour.next();

      const initial = { ...(tour.current.peek().rect as { height: number; width: number; x: number; y: number }) };
      expect(initial).toEqual({ height: 0, width: 0, x: 0, y: 0 });

      // Content growth elsewhere moved the target: report a new box, then fire
      // the observer the way a browser would.
      let box = { height: 40, width: 100, x: 12, y: 340 };
      target.getBoundingClientRect = () => box as DOMRect;
      for (const observer of observers) observer.trigger();

      expect(tour.current.peek().rect).toEqual(box);

      box = { height: 40, width: 100, x: 12, y: 520 };
      for (const observer of observers) observer.trigger();

      expect(tour.current.peek().rect).toEqual(box);
      tour.dispose();
    } finally {
      if (NativeRO === undefined) delete (globalThis as Record<string, unknown>).ResizeObserver;
      else globalThis.ResizeObserver = NativeRO;
    }
  });
});

describe('disposal', () => {
  it('throws BeaconDisposedError when a disposed tour is used', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.dispose();

    expect(tour.disposed).toBe(true);
    expect(() => tour.start()).toThrow(BeaconDisposedError);
    expect(() => tour.next()).toThrow(BeaconDisposedError);
    expect(() => tour.skip()).toThrow(BeaconDisposedError);
  });

  it('emits a dispose event and detaches tappers', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    const events: BeaconTourEvent[] = [];
    tour.tap((event) => events.push(event));
    tour.dispose();
    tour.dispose();

    expect(events.filter((event) => event.type === 'dispose')).toHaveLength(1);
  });

  it('returns a no-op unsubscribe when tapping a disposed tour', () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.dispose();
    const unsubscribe = tour.tap(() => {
      throw new Error('must not run');
    });

    expect(() => unsubscribe()).not.toThrow();
  });

  it('supports explicit resource disposal via Symbol.dispose', () => {
    using tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    expect(tour.status.peek()).toBe('active');
  });

  it('stops waiting for a target once disposed', async () => {
    const tour = createTour(tourConfig({ autoScroll: false }));
    tour.start();
    tour.next();
    tour.dispose();

    document.body.innerHTML = '<div data-beacon="campaigns"></div>';
    await settle();

    expect(tour.current.peek().step?.id).toBe('welcome');
  });
});
