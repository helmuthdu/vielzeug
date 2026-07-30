import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-avatar-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    // ore-avatar-group projects/queries `ore-avatar` children, so both must be registered.
    await import('./avatar');
    await import('./avatar-group');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders slotted avatars', async () => {
      fixture = await mount('ore-avatar-group', {
        html: `<ore-avatar initials="A"></ore-avatar>
               <ore-avatar initials="B"></ore-avatar>`,
      });

      expect(fixture.element.querySelectorAll('ore-avatar').length).toBe(2);
    });

    it('does not render overflow badge when count is within max', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '5' },
        html: '<ore-avatar initials="A"></ore-avatar><ore-avatar initials="B"></ore-avatar>',
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')).toBeFalsy();
    });

    it('renders overflow badge when count exceeds max', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '2' },
        html: `<ore-avatar initials="A"></ore-avatar>
               <ore-avatar initials="B"></ore-avatar>
               <ore-avatar initials="C"></ore-avatar>`,
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')).toBeTruthy();
    });

    it('overflow badge displays the count of hidden avatars', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '2' },
        html: `<ore-avatar initials="A"></ore-avatar>
               <ore-avatar initials="B"></ore-avatar>
               <ore-avatar initials="C"></ore-avatar>
               <ore-avatar initials="D"></ore-avatar>`,
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')?.textContent?.trim()).toBe('+2');
    });

    it('total prop overrides the computed overflow count', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '2', total: '10' },
        html: `<ore-avatar initials="A"></ore-avatar>
               <ore-avatar initials="B"></ore-avatar>
               <ore-avatar initials="C"></ore-avatar>`,
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')?.textContent?.trim()).toBe('+8');
    });
  });

  describe('Props', () => {
    it('applies max attribute on host', async () => {
      fixture = await mount('ore-avatar-group', { attrs: { max: '3' } });

      expect(fixture.element.getAttribute('max')).toBe('3');
    });

    it('reflects total attribute on host', async () => {
      fixture = await mount('ore-avatar-group', { attrs: { total: '20' } });

      expect(fixture.element.getAttribute('total')).toBe('20');
    });

    it('reflects total to the attribute when set via the JS property', async () => {
      fixture = await mount('ore-avatar-group');

      (fixture.element as HTMLElement & { total: number }).total = 15;
      await fixture.flush();

      expect(fixture.element.getAttribute('total')).toBe('15');
    });
  });

  describe('Accessibility', () => {
    it('overflow badge has aria-label describing hidden count', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '1' },
        html: '<ore-avatar initials="A"></ore-avatar><ore-avatar initials="B"></ore-avatar>',
      });

      await fixture.flush();

      expect(fixture.query('.overflow-badge')?.getAttribute('aria-label')).toBe('+1 more');
    });

    it('passes axe checks', async () => {
      fixture = await mount('ore-avatar-group', {
        attrs: { max: '2' },
        html: `<ore-avatar initials="A"></ore-avatar>
               <ore-avatar initials="B"></ore-avatar>
               <ore-avatar initials="C"></ore-avatar>`,
      });

      await fixture.flush();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
