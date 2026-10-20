import { BeaconConfigError, createCoachmark } from '../index';
import type { BeaconCoachmarkEvent, BeaconProgress, BeaconStorage } from '../types';

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

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.body.innerHTML = '<button data-beacon="create-build"></button>';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createCoachmark', () => {
  it('rejects an empty id', () => {
    expect(() => createCoachmark({ id: '', target: 'body' })).toThrow(BeaconConfigError);
  });

  it('shows automatically when the target exists and the hint was never seen', async () => {
    const mark = createCoachmark({ id: 'create-build', target: '[data-beacon="create-build"]' });
    await settle();

    expect(mark.current.peek().step).not.toBeNull();
    expect(mark.current.peek().rect).not.toBeNull();
    mark.dispose();
  });

  it('waits for a target that mounts later', async () => {
    document.body.innerHTML = '';
    const mark = createCoachmark({ id: 'late', target: '[data-beacon="late"]' });
    await settle();
    expect(mark.current.peek().step).toBeNull();

    document.body.innerHTML = '<div data-beacon="late"></div>';
    await settle();

    expect(mark.current.peek().step).not.toBeNull();
    mark.dispose();
  });

  it('does not show when autoShow is false', async () => {
    const mark = createCoachmark({ autoShow: false, id: 'manual', target: '[data-beacon="create-build"]' });
    await settle();
    expect(mark.current.peek().step).toBeNull();

    mark.show();
    expect(mark.current.peek().step).not.toBeNull();
    mark.dispose();
  });

  it('dismiss records the hint as seen so the next visit stays quiet', async () => {
    const storage = createTestStorage();
    const first = createCoachmark({ id: 'once', storage, target: '[data-beacon="create-build"]' });
    await settle();
    first.dismiss();
    first.dispose();

    const second = createCoachmark({ id: 'once', storage, target: '[data-beacon="create-build"]' });
    await settle();

    expect(second.eligible.peek()).toBe(false);
    expect(second.current.peek().step).toBeNull();
    second.dispose();
  });

  it('a newer version re-shows a dismissed coachmark', async () => {
    const storage = createTestStorage();
    const first = createCoachmark({ id: 'changed', storage, target: '[data-beacon="create-build"]', version: 1 });
    await settle();
    first.dismiss();
    first.dispose();

    const second = createCoachmark({ id: 'changed', storage, target: '[data-beacon="create-build"]', version: 2 });
    await settle();

    expect(second.eligible.peek()).toBe(true);
    expect(second.current.peek().step).not.toBeNull();
    second.dispose();
  });

  it('hide keeps the hint eligible, dismiss does not', async () => {
    const mark = createCoachmark({ id: 'hide-vs-dismiss', target: '[data-beacon="create-build"]' });
    await settle();

    mark.hide();
    expect(mark.current.peek().step).toBeNull();
    expect(mark.eligible.peek()).toBe(true);

    mark.show();
    mark.dismiss();
    expect(mark.eligible.peek()).toBe(false);
    mark.dispose();
  });

  it('reset clears the seen record', async () => {
    const storage = createTestStorage();
    const mark = createCoachmark({ id: 'reset-me', storage, target: '[data-beacon="create-build"]' });
    await settle();
    mark.dismiss();
    expect(storage.records.size).toBe(1);

    mark.reset();

    expect(storage.records.size).toBe(0);
    expect(mark.eligible.peek()).toBe(true);
    mark.dispose();
  });

  it('reports show and dismiss through tap', async () => {
    const mark = createCoachmark({ id: 'events', target: '[data-beacon="create-build"]' });
    const events: BeaconCoachmarkEvent[] = [];
    mark.tap((event) => events.push(event));
    await settle();
    mark.dismiss();

    expect(events.map((event) => event.type)).toEqual(['coachmark:show', 'coachmark:dismiss']);
    mark.dispose();
  });

  it('exposes the copy as a single-step snapshot', async () => {
    const mark = createCoachmark({
      description: 'Pick your gear.',
      id: 'copy',
      target: '[data-beacon="create-build"]',
      title: 'Create build',
    });
    await settle();

    expect(mark.current.peek().step?.title).toBe('Create build');
    expect(mark.current.peek().step?.description).toBe('Pick your gear.');
    expect(mark.current.peek().totalSteps).toBe(0);
    mark.dispose();
  });

  it('refreshes the rect when the target layout changes without scroll or resize', async () => {
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
      const mark = createCoachmark({ autoShow: false, id: 'layout', target: '[data-beacon="create-build"]' });
      mark.show();

      const button = document.querySelector('[data-beacon="create-build"]') as HTMLElement;

      expect(mark.current.peek().rect).toEqual({ height: 0, width: 0, x: 0, y: 0 });

      button.getBoundingClientRect = () => ({ height: 24, width: 80, x: 8, y: 640 }) as DOMRect;
      for (const observer of observers) observer.trigger();

      expect(mark.current.peek().rect).toEqual({ height: 24, width: 80, x: 8, y: 640 });
      mark.dispose();
    } finally {
      if (NativeRO === undefined) delete (globalThis as Record<string, unknown>).ResizeObserver;
      else globalThis.ResizeObserver = NativeRO;
    }
  });
});
