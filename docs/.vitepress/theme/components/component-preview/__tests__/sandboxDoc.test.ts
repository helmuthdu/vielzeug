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

  it('parses user HTML before registering custom elements', () => {
    const { fragment } = buildSandboxDoc({ dark: false, dir: 'ltr', html: '<ore-menu></ore-menu>', vertical: false });

    expect(fragment.indexOf('<div dir="ltr"')).toBeLessThan(fragment.indexOf('<script>'));
  });

  it('registers every native-dialog overlay for preview state synchronization', () => {
    const { fragment } = buildSandboxDoc({ dark: false, dir: 'ltr', html: '', vertical: false });

    expect(fragment).toContain('ORE-COMMAND-PALETTE');
    expect(fragment).toContain('ORE-DIALOG');
    expect(fragment).toContain('ORE-DRAWER');
    expect(fragment).toContain("event.key !== 'Escape'");
    expect(fragment).toContain("overlay.removeAttribute('open')");
    expect(fragment).toContain('syncAllOverlays');
  });

  it('removes Refine module imports while preserving example event wiring', () => {
    const { fragment } = buildSandboxDoc({
      dark: false,
      dir: 'ltr',
      html: "<script type=\"module\">\nimport '@vielzeug/refine/command-palette';\ndocument.body.dataset.ready = 'true';\n</script>",
      vertical: false,
    });

    expect(fragment).not.toContain("import '@vielzeug/refine/command-palette'");
    expect(fragment).toContain("document.body.dataset.ready = 'true'");
  });

  it('aligns preview content along its main axis', () => {
    const { fragment } = buildSandboxDoc({
      align: 'start',
      dark: false,
      dir: 'ltr',
      html: '',
      justify: 'end',
      vertical: false,
    });

    expect(fragment).toContain('justify-content: end');
  });

  it('starts preview content on its main axis by default', () => {
    const { fragment } = buildSandboxDoc({ dark: false, dir: 'ltr', html: '', vertical: false });

    expect(fragment).toContain('justify-content: start');
  });

  it('sets body flex-direction from `vertical` independently of `dir`', () => {
    const row = buildSandboxDoc({ dark: false, dir: 'ltr', html: '', vertical: false });
    const column = buildSandboxDoc({ dark: false, dir: 'rtl', html: '', vertical: true });

    expect(row.fragment).toContain('flex-direction: row');
    expect(column.fragment).toContain('flex-direction: column');
  });

  // Regression guard: body padding used to be `padding: 2rem; padding-bottom: 0`.
  // The sandbox iframe auto-resizes to document.body's border-box height (never
  // includes box-shadow spread), so a downward-offset halo/glow effect (e.g.
  // ore-button's hover/active box-shadow) got hard-clipped at the iframe's
  // bottom edge with zero room to render into — invisible only inside the
  // preview, visible everywhere else on the page. Padding must stay symmetric.
  it('gives body equal padding on every side — no lopsided padding-bottom: 0', () => {
    const { fragment } = buildSandboxDoc({ dark: false, dir: 'ltr', html: '', vertical: false });
    // Two rules mention `body` (a shared `html, body { ... }` reset plus this
    // one) — anchor on `display: flex` to grab the flex-layout rule specifically.
    const bodyRuleMatch = fragment.match(/body\s*\{\s*display:\s*flex[^}]*\}/);

    expect(bodyRuleMatch).not.toBeNull();
    expect(bodyRuleMatch![0]).toContain('padding: 2rem;');
    expect(bodyRuleMatch![0]).not.toContain('padding-bottom');
  });
});
