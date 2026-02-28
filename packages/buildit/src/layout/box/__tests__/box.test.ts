import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type ComponentFixture, createFixture } from '../../../utils/testing';

describe('bit-box', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../box');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with box class', async () => {
      fixture = await createFixture('bit-box');
      const box = fixture.query('.box');
      expect(box).toBeTruthy();
    });

    it('should render with content', async () => {
      fixture = await createFixture('bit-box');
      fixture.element.textContent = 'Test content';
      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should apply solid variant by default', async () => {
      fixture = await createFixture('bit-box');
      expect(fixture.element.hasAttribute('variant')).toBe(false);
    });

    it('should apply solid variant', async () => {
      fixture = await createFixture('bit-box', { variant: 'solid' });
      expect(fixture.element.getAttribute('variant')).toBe('solid');
    });

    it('should apply flat variant', async () => {
      fixture = await createFixture('bit-box', { variant: 'flat' });
      expect(fixture.element.getAttribute('variant')).toBe('flat');
    });

    it('should apply glass variant', async () => {
      fixture = await createFixture('bit-box', { variant: 'glass' });
      expect(fixture.element.getAttribute('variant')).toBe('glass');
    });

    it('should apply frost variant', async () => {
      fixture = await createFixture('bit-box', { variant: 'frost' });
      expect(fixture.element.getAttribute('variant')).toBe('frost');
    });
  });

  describe('Colors', () => {
    it('should apply primary color', async () => {
      fixture = await createFixture('bit-box', { color: 'primary' });
      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('should apply secondary color', async () => {
      fixture = await createFixture('bit-box', { color: 'secondary' });
      expect(fixture.element.getAttribute('color')).toBe('secondary');
    });

    it('should apply success color', async () => {
      fixture = await createFixture('bit-box', { color: 'success' });
      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    it('should apply warning color', async () => {
      fixture = await createFixture('bit-box', { color: 'warning' });
      expect(fixture.element.getAttribute('color')).toBe('warning');
    });

    it('should apply error color', async () => {
      fixture = await createFixture('bit-box', { color: 'error' });
      expect(fixture.element.getAttribute('color')).toBe('error');
    });

    it('should apply info color', async () => {
      fixture = await createFixture('bit-box', { color: 'info' });
      expect(fixture.element.getAttribute('color')).toBe('info');
    });
  });

  describe('Elevation', () => {
    it('should apply elevation 0', async () => {
      fixture = await createFixture('bit-box', { elevation: '0' });
      expect(fixture.element.getAttribute('elevation')).toBe('0');
    });

    it('should apply elevation 1', async () => {
      fixture = await createFixture('bit-box', { elevation: '1' });
      expect(fixture.element.getAttribute('elevation')).toBe('1');
    });

    it('should apply elevation 2', async () => {
      fixture = await createFixture('bit-box', { elevation: '2' });
      expect(fixture.element.getAttribute('elevation')).toBe('2');
    });

    it('should apply elevation 3', async () => {
      fixture = await createFixture('bit-box', { elevation: '3' });
      expect(fixture.element.getAttribute('elevation')).toBe('3');
    });

    it('should apply elevation 4', async () => {
      fixture = await createFixture('bit-box', { elevation: '4' });
      expect(fixture.element.getAttribute('elevation')).toBe('4');
    });

    it('should apply elevation 5', async () => {
      fixture = await createFixture('bit-box', { elevation: '5' });
      expect(fixture.element.getAttribute('elevation')).toBe('5');
    });
  });

  describe('Padding', () => {
    it('should apply none padding', async () => {
      fixture = await createFixture('bit-box', { padding: 'none' });
      expect(fixture.element.getAttribute('padding')).toBe('none');
    });

    it('should apply sm padding', async () => {
      fixture = await createFixture('bit-box', { padding: 'sm' });
      expect(fixture.element.getAttribute('padding')).toBe('sm');
    });

    it('should apply md padding', async () => {
      fixture = await createFixture('bit-box', { padding: 'md' });
      expect(fixture.element.getAttribute('padding')).toBe('md');
    });

    it('should apply lg padding', async () => {
      fixture = await createFixture('bit-box', { padding: 'lg' });
      expect(fixture.element.getAttribute('padding')).toBe('lg');
    });

    it('should apply xl padding', async () => {
      fixture = await createFixture('bit-box', { padding: 'xl' });
      expect(fixture.element.getAttribute('padding')).toBe('xl');
    });
  });

  describe('Combined attributes', () => {
    it('should combine variant, color, elevation, and padding', async () => {
      fixture = await createFixture('bit-box', {
        color: 'primary',
        elevation: '3',
        padding: 'lg',
        variant: 'glass',
      });

      expect(fixture.element.getAttribute('variant')).toBe('glass');
      expect(fixture.element.getAttribute('color')).toBe('primary');
      expect(fixture.element.getAttribute('elevation')).toBe('3');
      expect(fixture.element.getAttribute('padding')).toBe('lg');
    });
  });
});
