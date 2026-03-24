import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-avatar', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./avatar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders avatar container element', async () => {
      fixture = await mount('bit-avatar');

      expect(fixture.query('.avatar')).toBeTruthy();
    });

    it('renders image element when src is provided', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe', src: '/photo.jpg' } });

      const img = fixture.query<HTMLImageElement>('img');

      expect(img?.getAttribute('src')).toBe('/photo.jpg');
    });

    it('renders initials text when initials prop is provided', async () => {
      fixture = await mount('bit-avatar', { attrs: { initials: 'JD' } });

      expect(fixture.query('.initials')?.textContent?.trim()).toBe('JD');
    });

    it('derives initials from alt text with two words', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe' } });

      expect(fixture.query('.initials')?.textContent?.trim()).toBe('JD');
    });

    it('derives initials from single-word alt (first two chars)', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Alice' } });

      expect(fixture.query('.initials')?.textContent?.trim()).toBe('AL');
    });

    it('renders icon fallback when no src, initials, or alt', async () => {
      fixture = await mount('bit-avatar');

      expect(fixture.query('.icon-fallback')).toBeTruthy();
    });

    it('img is not rendered when src is absent', async () => {
      fixture = await mount('bit-avatar', { attrs: { initials: 'JD' } });

      expect(fixture.query('img')).toBeNull();
    });

    it('explicit initials prop overrides alt-derived initials', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe', initials: 'XY' } });

      expect(fixture.query('.initials')?.textContent?.trim()).toBe('XY');
    });

    it('initials prop is truncated to 2 characters', async () => {
      fixture = await mount('bit-avatar', { attrs: { initials: 'ABC' } });

      expect(fixture.query('.initials')?.textContent?.trim()).toBe('AB');
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies size attribute on host', async () => {
      fixture = await mount('bit-avatar', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies color attribute on host', async () => {
      fixture = await mount('bit-avatar', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies rounded attribute on host', async () => {
      fixture = await mount('bit-avatar', { attrs: { rounded: 'sm' } });

      expect(fixture.element.getAttribute('rounded')).toBe('sm');
    });

    it('applies status attribute on host', async () => {
      fixture = await mount('bit-avatar', { attrs: { status: 'online' } });

      expect(fixture.element.getAttribute('status')).toBe('online');
    });
  });

  // ─── Status Indicator ────────────────────────────────────────────────────────

  describe('Status Indicator', () => {
    it('renders status dot when status prop is provided', async () => {
      fixture = await mount('bit-avatar', { attrs: { status: 'online' } });

      expect(fixture.query('.status')).toBeTruthy();
    });

    it('does not render status dot when status is absent', async () => {
      fixture = await mount('bit-avatar');

      expect(fixture.query('.status')).toBeFalsy();
    });

    it('status dot has data-status attribute', async () => {
      fixture = await mount('bit-avatar', { attrs: { status: 'busy' } });

      expect(fixture.query('.status')?.getAttribute('data-status')).toBe('busy');
    });

    for (const status of ['online', 'offline', 'busy', 'away']) {
      it(`accepts status="${status}"`, async () => {
        fixture = await mount('bit-avatar', { attrs: { status } });

        expect(fixture.query('.status')?.getAttribute('data-status')).toBe(status);
        fixture.destroy();
      });
    }
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-avatar accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./avatar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Image Alt Text', () => {
    it('avatar wrapper has role="img" when alt text is provided', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Profile photo of Alice' } });

      expect(fixture.query('.avatar')?.getAttribute('role')).toBe('img');
    });

    it('avatar wrapper has aria-label matching the alt text', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Profile photo of Alice' } });

      expect(fixture.query('.avatar')?.getAttribute('aria-label')).toBe('Profile photo of Alice');
    });

    it('avatar wrapper has no role when no alt text', async () => {
      fixture = await mount('bit-avatar');

      expect(fixture.query('.avatar')?.getAttribute('role')).toBeNull();
    });
  });

  describe('Decorative Inner Elements', () => {
    it('img element has aria-hidden to avoid double-announcement', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe', src: '/photo.jpg' } });

      expect(fixture.query('img')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('initials span has aria-hidden when avatar wrapper has the label', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe' } });

      expect(fixture.query('.initials')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('fallback icon has aria-hidden to prevent noise for AT', async () => {
      fixture = await mount('bit-avatar');

      expect(fixture.query('.icon-fallback')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Status Indicator', () => {
    it('status dot is hidden from accessibility tree', async () => {
      fixture = await mount('bit-avatar', { attrs: { status: 'online' } });

      expect(fixture.query('.status')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('avatar label includes status when alt and status are both set', async () => {
      fixture = await mount('bit-avatar', { attrs: { alt: 'Jane Doe', status: 'online' } });

      expect(fixture.query('.avatar')?.getAttribute('aria-label')).toBe('Jane Doe, Online');
    });

    it('avatar has role="img" and status label when status is set without alt', async () => {
      fixture = await mount('bit-avatar', { attrs: { status: 'busy' } });

      expect(fixture.query('.avatar')?.getAttribute('role')).toBe('img');
      expect(fixture.query('.avatar')?.getAttribute('aria-label')).toBe('Status: Busy');
    });
  });
});

// ─── AvatarGroup ─────────────────────────────────────────────────────────────

describe('bit-avatar-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./avatar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders slotted avatars', async () => {
      fixture = await mount('bit-avatar-group', {
        html: `<bit-avatar initials="A"></bit-avatar>
               <bit-avatar initials="B"></bit-avatar>`,
      });

      expect(fixture.element.querySelectorAll('bit-avatar').length).toBe(2);
    });

    it('does not render overflow badge when count is within max', async () => {
      fixture = await mount('bit-avatar-group', {
        attrs: { max: '5' },
        html: '<bit-avatar initials="A"></bit-avatar><bit-avatar initials="B"></bit-avatar>',
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')).toBeFalsy();
    });

    it('renders overflow badge when count exceeds max', async () => {
      fixture = await mount('bit-avatar-group', {
        attrs: { max: '2' },
        html: `<bit-avatar initials="A"></bit-avatar>
               <bit-avatar initials="B"></bit-avatar>
               <bit-avatar initials="C"></bit-avatar>`,
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')).toBeTruthy();
    });

    it('overflow badge displays the count of hidden avatars', async () => {
      fixture = await mount('bit-avatar-group', {
        attrs: { max: '2' },
        html: `<bit-avatar initials="A"></bit-avatar>
               <bit-avatar initials="B"></bit-avatar>
               <bit-avatar initials="C"></bit-avatar>
               <bit-avatar initials="D"></bit-avatar>`,
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')?.textContent?.trim()).toBe('+2');
    });
  });

  describe('Props', () => {
    it('applies max attribute on host', async () => {
      fixture = await mount('bit-avatar-group', { attrs: { max: '3' } });

      expect(fixture.element.getAttribute('max')).toBe('3');
    });
  });

  describe('Accessibility', () => {
    it('overflow badge has aria-label describing hidden count', async () => {
      fixture = await mount('bit-avatar-group', {
        attrs: { max: '1' },
        html: '<bit-avatar initials="A"></bit-avatar><bit-avatar initials="B"></bit-avatar>',
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')?.getAttribute('aria-label')).toBe('+1 more');
    });
  });
});
