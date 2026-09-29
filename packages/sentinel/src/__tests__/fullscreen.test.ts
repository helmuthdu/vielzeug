import { describe, expect, it, vi } from 'vitest';
import { createFullscreen } from '../index.ts';

class TestWindow extends EventTarget {
  readonly document: Document;

  constructor(document: Document) {
    super();
    this.document = document;
  }
}

function createTestDocument(supported = true): Document {
  const doc = new EventTarget() as unknown as Record<string, unknown>;
  let fullscreenElement: Element | null = null;

  const element = {
    requestFullscreen: supported
      ? vi.fn(async () => {
          fullscreenElement = element as unknown as Element;
          (doc as unknown as EventTarget).dispatchEvent(new Event('fullscreenchange'));
        })
      : undefined,
  } as unknown as HTMLElement;

  Object.defineProperties(doc, {
    documentElement: { configurable: true, value: element },
    exitFullscreen: {
      configurable: true,
      value: supported
        ? vi.fn(async () => {
            fullscreenElement = null;
            (doc as unknown as EventTarget).dispatchEvent(new Event('fullscreenchange'));
          })
        : undefined,
    },
    fullscreenElement: { configurable: true, get: () => fullscreenElement },
  });

  return doc as unknown as Document;
}

function createTarget(supported = true): TestWindow {
  return new TestWindow(createTestDocument(supported));
}

describe('createFullscreen', () => {
  it('reports unsupported when the Fullscreen API is absent', () => {
    const target = createTarget(false);
    const fullscreen = createFullscreen({ target: target as unknown as Window });

    expect(fullscreen.getSnapshot()).toEqual({ active: false, supported: false });

    fullscreen.request();
    expect(fullscreen.getSnapshot().active).toBe(false);

    fullscreen.dispose();
  });

  it('enters and exits fullscreen', async () => {
    const target = createTarget();
    const fullscreen = createFullscreen({ target: target as unknown as Window });

    expect(fullscreen.getSnapshot().supported).toBe(true);
    expect(fullscreen.getSnapshot().active).toBe(false);

    fullscreen.request();
    await vi.waitFor(() => expect(fullscreen.getSnapshot().active).toBe(true));
    expect(target.document.documentElement.requestFullscreen).toHaveBeenCalled();

    fullscreen.exit();
    await vi.waitFor(() => expect(fullscreen.getSnapshot().active).toBe(false));
    expect(target.document.exitFullscreen).toHaveBeenCalled();

    fullscreen.dispose();
  });

  it('toggles fullscreen in both directions', async () => {
    const target = createTarget();
    const fullscreen = createFullscreen({ target: target as unknown as Window });

    fullscreen.toggle();
    await vi.waitFor(() => expect(fullscreen.getSnapshot().active).toBe(true));

    fullscreen.toggle();
    await vi.waitFor(() => expect(fullscreen.getSnapshot().active).toBe(false));

    fullscreen.dispose();
  });

  it('notifies subscribers when the fullscreen state changes', async () => {
    const target = createTarget();
    const fullscreen = createFullscreen({ target: target as unknown as Window });
    const listener = vi.fn();

    fullscreen.subscribe(listener);

    fullscreen.request();
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());

    fullscreen.dispose();
  });

  it('degrades silently when the browser refuses fullscreen', async () => {
    const doc = createTestDocument();
    const target = new TestWindow(doc);
    const fullscreen = createFullscreen({ target: target as unknown as Window });

    (target.document.documentElement.requestFullscreen as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );

    fullscreen.request();
    await vi.waitFor(() => expect(target.document.documentElement.requestFullscreen).toHaveBeenCalled());
    await Promise.resolve();

    expect(fullscreen.getSnapshot().active).toBe(false);

    fullscreen.dispose();
  });

  it('exits fullscreen on dispose and stops tracking changes', async () => {
    const target = createTarget();
    const fullscreen = createFullscreen({ target: target as unknown as Window });
    const removeSpy = vi.spyOn(target.document as unknown as EventTarget, 'removeEventListener');

    fullscreen.request();
    await vi.waitFor(() => expect(fullscreen.getSnapshot().active).toBe(true));

    fullscreen.dispose();

    expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
    expect(target.document.exitFullscreen).toHaveBeenCalled();
  });
});
