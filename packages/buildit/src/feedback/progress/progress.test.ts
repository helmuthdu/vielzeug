import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-progress', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./progress');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders linear progressbar by default', async () => {
      fixture = await mount('bit-progress', { attrs: { value: '40' } });

      expect(fixture.query('.track[role="progressbar"]')).toBeTruthy();
      expect(fixture.query('.fill')).toBeTruthy();
    });

    it('renders circular variant when requested', async () => {
      fixture = await mount('bit-progress', { attrs: { type: 'circular', value: '40' } });

      expect(fixture.query('.circular-track[role="progressbar"]')).toBeTruthy();
      expect(fixture.query('svg')).toBeTruthy();
    });

    it('renders circular-inner overlay inside circular variant', async () => {
      fixture = await mount('bit-progress', { attrs: { type: 'circular', value: '40' } });

      expect(fixture.query('.circular-inner')).toBeTruthy();
    });

    it('applies visible fill width in linear determinate mode', async () => {
      fixture = await mount('bit-progress', { attrs: { max: '100', value: '40' } });

      // Both the CSS custom property (for CSS var inheritance) and the inline
      // style binding (direct fallback) should reflect the correct percentage.
      expect(fixture.element.style.getPropertyValue('--_percent')).toBe('40%');

      const fill = fixture.query<HTMLElement>('.fill');

      expect(fill?.getAttribute('style')).toContain('width:40%');
    });
  });

  describe('Accessibility', () => {
    it('exposes valuemin and valuemax attributes', async () => {
      fixture = await mount('bit-progress', { attrs: { max: '200', value: '40' } });

      const el = fixture.query('[role="progressbar"]');

      expect(el?.getAttribute('aria-valuemin')).toBe('0');
      expect(el?.getAttribute('aria-valuemax')).toBe('200');
    });

    it('exposes valuenow in determinate mode', async () => {
      fixture = await mount('bit-progress', { attrs: { value: '40' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
    });

    it('omits valuenow in indeterminate mode for screen readers', async () => {
      fixture = await mount('bit-progress', { attrs: { indeterminate: '', label: 'Loading tasks' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBeNull();
      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Loading tasks');
    });

    it('falls back to "Progress" as aria-label when neither label nor title is set', async () => {
      fixture = await mount('bit-progress', { attrs: { value: '50' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Progress');
    });
  });

  describe('Label', () => {
    it('renders a visible trailing label when label is present without title', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '60%', value: '60' } });

      const rowLabel = fixture.query('.row-label');

      expect(rowLabel?.textContent?.trim()).toBe('60%');
    });

    it('uses label as aria-label', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '60%', value: '60' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('60%');
    });

    it('wraps track and label in bar-row when label is present without title', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '60%', value: '60' } });

      const barRow = fixture.query('.bar-row');
      const trackOuter = fixture.query('.track-outer');

      expect(barRow).toBeTruthy();
      expect(trackOuter).toBeTruthy();
    });
  });

  describe('Title', () => {
    it('renders title text above the bar', async () => {
      fixture = await mount('bit-progress', { attrs: { title: 'Upload', value: '60' } });

      const titleEl = fixture.query('.progress-title');

      expect(titleEl?.textContent?.trim()).toBe('Upload');
    });

    it('uses title as aria-label fallback when no label is set', async () => {
      fixture = await mount('bit-progress', { attrs: { title: 'Upload', value: '60' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Upload');
    });

    it('renders a header element when title is set', async () => {
      fixture = await mount('bit-progress', { attrs: { title: 'Upload', value: '60' } });

      expect(fixture.query('.header')).toBeTruthy();
    });

    it('moves label into the header row when both title and label are set', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '60%', title: 'Upload', value: '60' } });

      const headerLabel = fixture.query('.header-label');

      expect(headerLabel?.textContent?.trim()).toBe('60%');
    });

    it('label is used as aria-label even when it is also shown in the header row', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '60%', title: 'Upload', value: '60' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('60%');
    });
  });

  describe('Floating label', () => {
    it('renders the floating chip with the provided text', async () => {
      fixture = await mount('bit-progress', { attrs: { 'floating-label': '60%', value: '60' } });

      const chip = fixture.query('.floating-label');

      expect(chip?.textContent?.trim()).toBe('60%');
    });

    it('floating label is always in the DOM (CSS controls visibility)', async () => {
      fixture = await mount('bit-progress', { attrs: { 'floating-label': '??', indeterminate: '' } });

      // The element is rendered; display:none is applied via CSS for indeterminate state
      expect(fixture.query('.floating-label')).toBeTruthy();
    });

    it('track-outer is present as positioning context for floating label', async () => {
      fixture = await mount('bit-progress', { attrs: { 'floating-label': '40%', value: '40' } });

      expect(fixture.query('.track-outer')).toBeTruthy();
    });
  });

  describe('Circular label and title', () => {
    it('renders label text inside the ring', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '75%', type: 'circular', value: '75' } });

      const labelEl = fixture.query('.circular-label');

      expect(labelEl?.textContent?.trim()).toBe('75%');
    });

    it('renders title text below the label inside the ring', async () => {
      fixture = await mount('bit-progress', {
        attrs: { label: '75%', title: 'Storage', type: 'circular', value: '75' },
      });

      const titleEl = fixture.query('.circular-title');

      expect(titleEl?.textContent?.trim()).toBe('Storage');
    });

    it('uses label as aria-label on circular track', async () => {
      fixture = await mount('bit-progress', { attrs: { label: '75%', type: 'circular', value: '75' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('75%');
    });

    it('falls back to title as aria-label on circular when no label is set', async () => {
      fixture = await mount('bit-progress', {
        attrs: { title: 'Storage', type: 'circular', value: '75' },
      });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Storage');
    });

    it('falls back to "Progress" as aria-label on circular when neither label nor title is set', async () => {
      fixture = await mount('bit-progress', { attrs: { type: 'circular', value: '75' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Progress');
    });
  });
});
