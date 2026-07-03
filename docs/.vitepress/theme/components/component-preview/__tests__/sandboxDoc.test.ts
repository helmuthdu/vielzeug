import { describe, expect, it } from 'vitest';

import { buildSandboxDoc } from '../sandboxDoc';

describe('buildSandboxDoc()', () => {
  it('applies dir="ltr" via a display:contents wrapper around the user html', () => {
    const { fragment } = buildSandboxDoc({
      dark: false,
      dir: 'ltr',
      html: '<ore-button>Click</ore-button>',
      vertical: false,
    });

    expect(fragment).toContain('<div dir="ltr" style="display: contents"><ore-button>Click</ore-button></div>');
  });

  it('applies dir="rtl" via a display:contents wrapper around the user html', () => {
    const { fragment } = buildSandboxDoc({
      dark: false,
      dir: 'rtl',
      html: '<ore-button>Click</ore-button>',
      vertical: false,
    });

    expect(fragment).toContain('<div dir="rtl" style="display: contents"><ore-button>Click</ore-button></div>');
  });

  it('does not add an extra flex item — the wrapper is display:contents, not display:block', () => {
    const { fragment } = buildSandboxDoc({ dark: false, dir: 'ltr', html: '<span></span>', vertical: false });

    expect(fragment).toContain('display: contents');
  });

  it('sets body flex-direction from `vertical` independently of `dir`', () => {
    const row = buildSandboxDoc({ dark: false, dir: 'ltr', html: '', vertical: false });
    const column = buildSandboxDoc({ dark: false, dir: 'rtl', html: '', vertical: true });

    expect(row.fragment).toContain('flex-direction: row');
    expect(column.fragment).toContain('flex-direction: column');
  });
});
