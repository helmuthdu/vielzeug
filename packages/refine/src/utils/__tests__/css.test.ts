import { safeCSSLength } from '../css';

describe('safeCSSLength', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(safeCSSLength(null)).toBeNull();
    expect(safeCSSLength(undefined)).toBeNull();
    expect(safeCSSLength('')).toBeNull();
  });

  it('trims and accepts a plain unit length', () => {
    expect(safeCSSLength('  100px  ')).toBe('100px');
  });

  it('accepts every documented unit', () => {
    for (const unit of [
      'px',
      'em',
      'rem',
      '%',
      'vh',
      'vw',
      'vmin',
      'vmax',
      'dvh',
      'dvw',
      'svh',
      'svw',
      'ch',
      'ex',
      'lh',
      'rlh',
      'cm',
      'mm',
      'in',
      'pt',
      'pc',
      'fr',
      's',
      'ms',
      'deg',
      'rad',
      'turn',
    ]) {
      expect(safeCSSLength(`1${unit}`)).toBe(`1${unit}`);
    }
  });

  it('accepts negative and decimal values', () => {
    expect(safeCSSLength('-4px')).toBe('-4px');
    expect(safeCSSLength('1.5rem')).toBe('1.5rem');
    expect(safeCSSLength('-0.5em')).toBe('-0.5em');
  });

  it('accepts the documented CSS keywords', () => {
    for (const keyword of ['0', 'auto', 'none', 'inherit', 'initial', 'unset', 'revert']) {
      expect(safeCSSLength(keyword)).toBe(keyword);
    }
  });

  it('accepts var()/calc()/env()/clamp()/min()/max() expressions', () => {
    expect(safeCSSLength('var(--size-4)')).toBe('var(--size-4)');
    expect(safeCSSLength('calc(100% - 8px)')).toBe('calc(100% - 8px)');
    expect(safeCSSLength('env(safe-area-inset-top)')).toBe('env(safe-area-inset-top)');
    expect(safeCSSLength('clamp(1rem, 2vw, 3rem)')).toBe('clamp(1rem, 2vw, 3rem)');
    expect(safeCSSLength('min(50%, 20rem)')).toBe('min(50%, 20rem)');
    expect(safeCSSLength('max(1rem, 2vw)')).toBe('max(1rem, 2vw)');
    expect(safeCSSLength('var(--fallback, 10px)')).toBe('var(--fallback, 10px)');
  });

  it('rejects a unitless number', () => {
    expect(safeCSSLength('100')).toBeNull();
  });

  it('rejects an unrecognized unit', () => {
    expect(safeCSSLength('100xyz')).toBeNull();
  });

  it('rejects CSS injection via semicolons', () => {
    expect(safeCSSLength('100px; background: url(evil)')).toBeNull();
  });

  it('rejects CSS injection via curly braces', () => {
    expect(safeCSSLength('100px} .evil { color: red')).toBeNull();
  });

  it('rejects embedded newlines/carriage returns', () => {
    expect(safeCSSLength('100px\n; evil')).toBeNull();
    expect(safeCSSLength('100px\r; evil')).toBeNull();
  });

  it('rejects an unclosed function expression', () => {
    expect(safeCSSLength('calc(100% - 8px')).toBeNull();
  });

  it('rejects a function expression containing an injection sequence', () => {
    expect(safeCSSLength('calc(100%; evil)')).toBeNull();
  });

  it('rejects arbitrary non-length strings', () => {
    expect(safeCSSLength('red')).toBeNull();
    expect(safeCSSLength('not-a-length')).toBeNull();
  });
});
