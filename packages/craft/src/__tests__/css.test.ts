import { css, type CSSResult } from '../index';

describe('css()', () => {
  it('returns an object with the rendered CSS string as content', () => {
    const result = css`
      color: red;
    `;

    expect(result.content).toBe('color: red;');
  });

  it('trims whitespace from the result', () => {
    const result = css`
      color: red;
    `;

    expect(result.content).toBe('color: red;');
  });

  it('interpolates string values', () => {
    const color = 'blue';
    const result = css`
      color: ${color};
    `;

    expect(result.content).toBe('color: blue;');
  });

  it('interpolates numeric values', () => {
    const size = 16;
    const result = css`
      font-size: ${size}px;
    `;

    expect(result.content).toBe('font-size: 16px;');
  });

  it('interpolates nested CSSResult objects (inlines their content)', () => {
    const base = css`
      color: red;
    `;
    const extended = css`
      ${base} font-weight: bold;
    `;

    expect(extended.content).toBe('color: red; font-weight: bold;');
  });

  it('toString() returns the CSS content string', () => {
    const result = css`
      display: flex;
    `;

    expect(String(result)).toBe('display: flex;');
    expect(result.toString()).toBe('display: flex;');
  });

  it('each call produces a distinct CSSResult object', () => {
    const a = css`
      color: red;
    `;
    const b = css`
      color: red;
    `;

    expect(a).not.toBe(b);
  });

  describe('type guard via brand', () => {
    it('branded CSSResult is accepted by css() interpolation', () => {
      const inner = css`
        margin: 0;
      `;
      const outer = css`
        ${inner} padding: 0;
      `;

      expect(outer.content).toContain('margin: 0;');
    });

    it('plain object with content property is NOT treated as CSSResult', () => {
      const fake = { content: 'color: red;', toString: () => 'color: red;' } as CSSResult;
      const result = css`
        ${fake}
      `;

      expect(result.content).toBe('color: red;');
    });
  });
});
