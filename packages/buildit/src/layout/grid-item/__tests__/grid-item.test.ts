import { type ComponentFixture, createFixture } from '../../../utils/testing';

describe('bit-grid-item', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../grid-item');
    await import('../../grid/grid');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with slot', async () => {
      fixture = await createFixture('bit-grid-item');

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });

    it('should render content', async () => {
      fixture = await createFixture('bit-grid-item');
      fixture.element.innerHTML = 'Grid item content';

      expect(fixture.element.textContent).toBe('Grid item content');
    });
  });

  describe('Column Span', () => {
    it('should apply colSpan of 1', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: '1' });

      expect(fixture.element.getAttribute('colSpan')).toBe('1');
    });

    it('should apply colSpan of 2', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: '2' });

      expect(fixture.element.getAttribute('colSpan')).toBe('2');
    });

    it('should apply colSpan of 3', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: '3' });

      expect(fixture.element.getAttribute('colSpan')).toBe('3');
    });

    it('should apply colSpan of 12', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: '12' });

      expect(fixture.element.getAttribute('colSpan')).toBe('12');
    });

    it('should apply colSpan of full', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: 'full' });

      expect(fixture.element.getAttribute('colSpan')).toBe('full');
    });
  });

  describe('Row Span', () => {
    it('should apply rowSpan of 1', async () => {
      fixture = await createFixture('bit-grid-item', { rowSpan: '1' });

      expect(fixture.element.getAttribute('rowSpan')).toBe('1');
    });

    it('should apply rowSpan of 2', async () => {
      fixture = await createFixture('bit-grid-item', { rowSpan: '2' });

      expect(fixture.element.getAttribute('rowSpan')).toBe('2');
    });

    it('should apply rowSpan of 6', async () => {
      fixture = await createFixture('bit-grid-item', { rowSpan: '6' });

      expect(fixture.element.getAttribute('rowSpan')).toBe('6');
    });

    it('should apply rowSpan of full', async () => {
      fixture = await createFixture('bit-grid-item', { rowSpan: 'full' });

      expect(fixture.element.getAttribute('rowSpan')).toBe('full');
    });
  });

  describe('Column Start/End', () => {
    it('should apply colStart', async () => {
      fixture = await createFixture('bit-grid-item', { colStart: '2' });

      expect(fixture.element.getAttribute('colStart')).toBe('2');
    });

    it('should apply colEnd', async () => {
      fixture = await createFixture('bit-grid-item', { colEnd: '4' });

      expect(fixture.element.getAttribute('colEnd')).toBe('4');
    });

    it('should apply both colStart and colEnd', async () => {
      fixture = await createFixture('bit-grid-item', { colEnd: '3', colStart: '1' });

      expect(fixture.element.getAttribute('colStart')).toBe('1');
      expect(fixture.element.getAttribute('colEnd')).toBe('3');
    });

    it('should apply colEnd auto', async () => {
      fixture = await createFixture('bit-grid-item', { colEnd: 'auto' });

      expect(fixture.element.getAttribute('colEnd')).toBe('auto');
    });
  });

  describe('Row Start/End', () => {
    it('should apply rowStart', async () => {
      fixture = await createFixture('bit-grid-item', { rowStart: '2' });

      expect(fixture.element.getAttribute('rowStart')).toBe('2');
    });

    it('should apply rowEnd', async () => {
      fixture = await createFixture('bit-grid-item', { rowEnd: '4' });

      expect(fixture.element.getAttribute('rowEnd')).toBe('4');
    });

    it('should apply both rowStart and rowEnd', async () => {
      fixture = await createFixture('bit-grid-item', { rowEnd: '3', rowStart: '1' });

      expect(fixture.element.getAttribute('rowStart')).toBe('1');
      expect(fixture.element.getAttribute('rowEnd')).toBe('3');
    });

    it('should apply rowStart auto', async () => {
      fixture = await createFixture('bit-grid-item', { rowStart: 'auto' });

      expect(fixture.element.getAttribute('rowStart')).toBe('auto');
    });
  });

  describe('Alignment', () => {
    it('should apply start alignment', async () => {
      fixture = await createFixture('bit-grid-item', { align: 'start' });

      expect(fixture.element.getAttribute('align')).toBe('start');
    });

    it('should apply center alignment', async () => {
      fixture = await createFixture('bit-grid-item', { align: 'center' });

      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('should apply end alignment', async () => {
      fixture = await createFixture('bit-grid-item', { align: 'end' });

      expect(fixture.element.getAttribute('align')).toBe('end');
    });

    it('should apply stretch alignment', async () => {
      fixture = await createFixture('bit-grid-item', { align: 'stretch' });

      expect(fixture.element.getAttribute('align')).toBe('stretch');
    });
  });

  describe('Justify Self', () => {
    it('should apply start justification', async () => {
      fixture = await createFixture('bit-grid-item', { justify: 'start' });

      expect(fixture.element.getAttribute('justify')).toBe('start');
    });

    it('should apply center justification', async () => {
      fixture = await createFixture('bit-grid-item', { justify: 'center' });

      expect(fixture.element.getAttribute('justify')).toBe('center');
    });

    it('should apply end justification', async () => {
      fixture = await createFixture('bit-grid-item', { justify: 'end' });

      expect(fixture.element.getAttribute('justify')).toBe('end');
    });

    it('should apply stretch justification', async () => {
      fixture = await createFixture('bit-grid-item', { justify: 'stretch' });

      expect(fixture.element.getAttribute('justify')).toBe('stretch');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      fixture = await createFixture('bit-grid-item');

      expect(fixture.element.textContent).toBe('');
    });

    it('should handle multiple attributes', async () => {
      fixture = await createFixture('bit-grid-item', {
        align: 'center',
        colSpan: '2',
        justify: 'center',
        rowSpan: '2',
      });

      expect(fixture.element.getAttribute('colSpan')).toBe('2');
      expect(fixture.element.getAttribute('rowSpan')).toBe('2');
      expect(fixture.element.getAttribute('align')).toBe('center');
      expect(fixture.element.getAttribute('justify')).toBe('center');
    });

    it('should update attributes dynamically', async () => {
      fixture = await createFixture('bit-grid-item', { colSpan: '1' });

      await fixture.setAttribute('colSpan', '3');

      expect(fixture.element.getAttribute('colSpan')).toBe('3');
    });

    it('should handle complex placement', async () => {
      fixture = await createFixture('bit-grid-item', {
        colEnd: '4',
        colStart: '1',
        rowEnd: '5',
        rowStart: '2',
      });

      expect(fixture.element.getAttribute('colStart')).toBe('1');
      expect(fixture.element.getAttribute('colEnd')).toBe('4');
      expect(fixture.element.getAttribute('rowStart')).toBe('2');
      expect(fixture.element.getAttribute('rowEnd')).toBe('5');
    });
  });

  describe('Integration with bit-grid', () => {
    it('should work inside bit-grid', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '3', gap: 'md' });
      gridFixture.element.innerHTML = `
        <bit-grid-item colSpan="2">Wide item</bit-grid-item>
        <bit-grid-item>Normal item</bit-grid-item>
        <bit-grid-item>Normal item</bit-grid-item>
      `;

      const items = gridFixture.element.querySelectorAll('bit-grid-item');
      expect(items.length).toBe(3);
      expect(items[0].getAttribute('colSpan')).toBe('2');

      gridFixture.destroy();
    });
  });
});
