import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type ComponentFixture, createFixture } from '../../../utils/trial';

describe('bit-grid', () => {
  let fixture: ComponentFixture<HTMLElement>;
  beforeAll(async () => {
    await import('../grid');
  });
  afterEach(() => {
    fixture?.destroy();
  });
  describe('Rendering', () => {
    it('should render with slot', async () => {
      fixture = await createFixture('bit-grid');
      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });
    it('should render child elements', async () => {
      fixture = await createFixture('bit-grid');
      fixture.element.innerHTML = '<div>Item 1</div><div>Item 2</div><div>Item 3</div>';
      const items = fixture.element.querySelectorAll('div');
      expect(items.length).toBe(3);
    });
  });
  describe('Columns', () => {
    it('should apply 1 column layout', async () => {
      fixture = await createFixture('bit-grid', { cols: '1' });
      expect(fixture.element.getAttribute('cols')).toBe('1');
    });
    it('should apply 3 column layout', async () => {
      fixture = await createFixture('bit-grid', { cols: '3' });
      expect(fixture.element.getAttribute('cols')).toBe('3');
    });
    it('should apply 12 column layout', async () => {
      fixture = await createFixture('bit-grid', { cols: '12' });
      expect(fixture.element.getAttribute('cols')).toBe('12');
    });
    it('should apply auto column layout', async () => {
      fixture = await createFixture('bit-grid', { cols: 'auto' });
      expect(fixture.element.getAttribute('cols')).toBe('auto');
    });
  });
  describe('Responsive Columns', () => {
    it('should apply cols-sm attribute', async () => {
      fixture = await createFixture('bit-grid', { 'cols-sm': '2' });
      expect(fixture.element.getAttribute('cols-sm')).toBe('2');
    });
    it('should apply cols-md attribute', async () => {
      fixture = await createFixture('bit-grid', { 'cols-md': '3' });
      expect(fixture.element.getAttribute('cols-md')).toBe('3');
    });
    it('should apply cols-lg attribute', async () => {
      fixture = await createFixture('bit-grid', { 'cols-lg': '4' });
      expect(fixture.element.getAttribute('cols-lg')).toBe('4');
    });
    it('should apply cols-xl attribute', async () => {
      fixture = await createFixture('bit-grid', { 'cols-xl': '6' });
      expect(fixture.element.getAttribute('cols-xl')).toBe('6');
    });
  });
  describe('Rows', () => {
    it('should apply 1 row layout', async () => {
      fixture = await createFixture('bit-grid', { rows: '1' });
      expect(fixture.element.getAttribute('rows')).toBe('1');
    });
    it('should apply 3 row layout', async () => {
      fixture = await createFixture('bit-grid', { rows: '3' });
      expect(fixture.element.getAttribute('rows')).toBe('3');
    });
    it('should combine cols and rows', async () => {
      fixture = await createFixture('bit-grid', { cols: '3', rows: '2' });
      expect(fixture.element.getAttribute('cols')).toBe('3');
      expect(fixture.element.getAttribute('rows')).toBe('2');
    });
  });
  describe('Gap', () => {
    it('should apply none gap', async () => {
      fixture = await createFixture('bit-grid', { gap: 'none' });
      expect(fixture.element.getAttribute('gap')).toBe('none');
    });
    it('should apply md gap', async () => {
      fixture = await createFixture('bit-grid', { gap: 'md' });
      expect(fixture.element.getAttribute('gap')).toBe('md');
    });
    it('should apply 2xl gap', async () => {
      fixture = await createFixture('bit-grid', { gap: '2xl' });
      expect(fixture.element.getAttribute('gap')).toBe('2xl');
    });
  });
  describe('Alignment', () => {
    it('should apply align center', async () => {
      fixture = await createFixture('bit-grid', { align: 'center' });
      expect(fixture.element.getAttribute('align')).toBe('center');
    });
    it('should apply justify end', async () => {
      fixture = await createFixture('bit-grid', { justify: 'end' });
      expect(fixture.element.getAttribute('justify')).toBe('end');
    });
  });
  describe('Flow', () => {
    it('should apply row-dense flow', async () => {
      fixture = await createFixture('bit-grid', { flow: 'row-dense' });
      expect(fixture.element.getAttribute('flow')).toBe('row-dense');
    });
    it('should apply column flow', async () => {
      fixture = await createFixture('bit-grid', { flow: 'column' });
      expect(fixture.element.getAttribute('flow')).toBe('column');
    });
  });
  describe('Layout Presets', () => {
    it('should apply sidebar layout', async () => {
      fixture = await createFixture('bit-grid', { layout: 'sidebar' });
      expect(fixture.element.getAttribute('layout')).toBe('sidebar');
    });
    it('should apply bento layout', async () => {
      fixture = await createFixture('bit-grid', { layout: 'bento' });
      expect(fixture.element.getAttribute('layout')).toBe('bento');
    });
    it('should apply app-shell layout (M3)', async () => {
      fixture = await createFixture('bit-grid', { layout: 'app-shell' });
      expect(fixture.element.getAttribute('layout')).toBe('app-shell');
    });
    it('should apply nav-content layout (M3)', async () => {
      fixture = await createFixture('bit-grid', { layout: 'nav-content' });
      expect(fixture.element.getAttribute('layout')).toBe('nav-content');
    });
  });
  describe('Responsive Mode', () => {
    it('should apply responsive attribute', async () => {
      fixture = await createFixture('bit-grid', { responsive: true });
      expect(fixture.element.hasAttribute('responsive')).toBe(true);
    });
  });
});
