import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-lightbox', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
    await import('./lightbox');
  });
  afterEach(() => {
    fixture?.dispose();
  });

  it('opens the activated image and navigates a bounded gallery', async () => {
    fixture = await mount('ore-lightbox', {
      attrs: { label: 'Photos' },
      html: '<button type="button" data-preview-src="/full-a.png"><img src="/a.png" alt="A"></button><button type="button"><img src="/b.png" alt="B"></button>',
    });
    const changes: Array<{ index: number; alt: string; src: string }> = [];
    fixture.element.addEventListener('change', (event) => {
      changes.push((event as CustomEvent<{ index: number; alt: string; src: string }>).detail);
    });
    const triggers = fixture.element.querySelectorAll('button');

    await fixture.act(() => fireClick(triggers[0]));
    expect(fixture.query('dialog')?.hasAttribute('open')).toBe(true);
    expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Photos');
    expect(changes[0]).toMatchObject({ alt: 'A', index: 0, src: '/full-a.png' });
    fireKeyDown(fixture.query('dialog')!, { key: 'ArrowRight' });
    await fixture.flush();
    expect(changes[1]).toMatchObject({ alt: 'B', index: 1 });
    expect(fixture.query('[part="next"]')?.getAttribute('aria-disabled')).toBe('true');
    fireClick(fixture.query('[part="next"]')!);
    expect(changes).toHaveLength(2);
    expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    fireClick(fixture.query('[part="close"]')!);
    await fixture.flush();
    expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('updates the active image after a trigger is removed and closes when none remain', async () => {
    fixture = await mount('ore-lightbox', {
      html: '<button type="button"><img src="/a.png" alt="A"></button><button type="button"><img src="/b.png" alt="B"></button>',
    });
    const triggers = fixture.element.querySelectorAll('button');

    await fixture.act(() => fireClick(triggers[0]));
    await fixture.act(() => triggers[0].remove());
    expect(fixture.query('[part="image"]')?.getAttribute('alt')).toBe('B');
    await fixture.act(() => triggers[1].remove());
    expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('replaces the loading skeleton with the image or an error', async () => {
    fixture = await mount('ore-lightbox', {
      html: '<button type="button"><img src="/a.png" alt="A"></button>',
    });

    await fixture.act(() => fireClick(fixture.element.querySelector('button')!));
    const skeleton = fixture.query('ore-skeleton')!;
    const image = fixture.query<HTMLImageElement>('[part="image"]')!;

    expect(skeleton.hasAttribute('hidden')).toBe(false);
    expect(skeleton.hasAttribute('striped')).toBe(false);
    expect(image.hasAttribute('hidden')).toBe(true);

    await fixture.act(() => image.dispatchEvent(new Event('load')));
    expect(skeleton.hasAttribute('hidden')).toBe(true);
    expect(image.hasAttribute('hidden')).toBe(false);

    await fixture.act(() => image.dispatchEvent(new Event('error')));
    expect(skeleton.hasAttribute('hidden')).toBe(true);
    expect(image.hasAttribute('hidden')).toBe(true);
    expect(fixture.query('[role="status"]')?.textContent).toContain('Image could not be loaded.');
  });

  it('settles a cached preview without waiting for another load event', async () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640);

    fixture = await mount('ore-lightbox', {
      html: '<button type="button"><img src="/cached.png" alt="Cached"></button>',
    });

    try {
      await fixture.act(() => fireClick(fixture.element.querySelector('button')!));
      const skeleton = fixture.query('ore-skeleton')!;
      const image = fixture.query<HTMLImageElement>('[part="image"]')!;

      await fixture.act(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          }),
      );

      expect(skeleton.hasAttribute('hidden')).toBe(true);
      expect(image.hasAttribute('hidden')).toBe(false);
    } finally {
      complete.mockRestore();
      naturalWidth.mockRestore();
    }
  });

  it('selects thumbnails and updates them when gallery items change', async () => {
    fixture = await mount('ore-lightbox', {
      html: '<button type="button" data-preview-src="/full-a.png"><img src="/thumb-a.png" alt="A"></button><button type="button"><img src="/b.png" alt="B"></button>',
    });
    await fixture.act(() => fireClick(fixture.element.querySelector('button')!));

    const buttons = fixture.shadow!.querySelectorAll<HTMLButtonElement>('[part="thumbnail"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    expect(buttons[0].getAttribute('aria-label')).toBe('A (1 of 2)');
    expect(buttons[0].querySelector('img')?.getAttribute('src')).toContain('/thumb-a.png');

    await fixture.act(() => fireClick(buttons[1]));
    expect(fixture.query('[part="image"]')?.getAttribute('alt')).toBe('B');
    expect(buttons[1].getAttribute('aria-current')).toBe('true');
    expect(buttons[0].hasAttribute('aria-current')).toBe(false);

    await fixture.act(() => {
      const image = fixture.element.querySelector('button img')!;
      image.setAttribute('alt', 'Updated');
      image.setAttribute('src', '/updated.png');
    });
    expect(buttons[0].getAttribute('aria-label')).toBe('Updated (1 of 2)');
    expect(buttons[0].querySelector('img')?.getAttribute('src')).toContain('/updated.png');
  });

  it('limits thumbnails to a moving window and accepts a changed limit', async () => {
    fixture = await mount('ore-lightbox', {
      html: Array.from({ length: 8 }, (_, i) => `<button><img src="/${i}.png" alt="Photo ${i + 1}"></button>`).join(''),
    });
    await fixture.act(() => fireClick(fixture.element.querySelectorAll('button')[4]));
    const labels = () =>
      Array.from(fixture.shadow!.querySelectorAll('[part="thumbnail"]'), (button) => button.getAttribute('aria-label'));

    expect(labels()).toEqual([
      'Photo 3 (3 of 8)',
      'Photo 4 (4 of 8)',
      'Photo 5 (5 of 8)',
      'Photo 6 (6 of 8)',
      'Photo 7 (7 of 8)',
    ]);
    await fixture.act(() => fixture.element.setAttribute('max-thumbnails', '3'));
    expect(labels()).toEqual(['Photo 4 (4 of 8)', 'Photo 5 (5 of 8)', 'Photo 6 (6 of 8)']);
    await fixture.act(() => fireClick(fixture.query('[part="next"]')!));
    expect(labels()).toEqual(['Photo 5 (5 of 8)', 'Photo 6 (6 of 8)', 'Photo 7 (7 of 8)']);
    expect(fixture.query('[part="image"]')?.getAttribute('alt')).toBe('Photo 6');
  });

  it('uses the default window and warns for an invalid limit', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      fixture = await mount('ore-lightbox', {
        attrs: { 'max-thumbnails': 0 },
        html: Array.from({ length: 7 }, (_, i) => `<button><img src="/${i}.png" alt="Photo ${i + 1}"></button>`).join(
          '',
        ),
      });
      await fixture.act(() => fireClick(fixture.element.querySelector('button')!));
      expect(fixture.shadow!.querySelectorAll('[part="thumbnail"]')).toHaveLength(5);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('max-thumbnails must be a positive safe integer'));
    } finally {
      warning.mockRestore();
    }
  });
});
