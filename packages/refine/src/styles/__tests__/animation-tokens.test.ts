// Guards the `--animate-*` token layer: every named animation must compose a
// keyframe that actually ships in animation.css, must route through the
// duration/easing tokens (so Reduced Motion governs it), and the two
// reduced-motion blocks in theme.css (media query + data-motion='reduced')
// must stay in sync — the declaration list is duplicated by necessity and
// drift here would silently un-reduce motion for one of the two paths.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(import.meta.dirname, '..');
const themeCss = readFileSync(join(stylesDir, 'theme.css'), 'utf-8');
const animationCss = readFileSync(join(stylesDir, 'animation.css'), 'utf-8');

const animateTokens = [...themeCss.matchAll(/^\s*(--animate-[a-z-]+):\s*([^;]+);/gm)];

describe('--animate-* tokens', () => {
  it('are defined', () => {
    expect(animateTokens.length).toBeGreaterThanOrEqual(10);
  });

  it('each reference a keyframe defined in animation.css', () => {
    const defined = new Set([...animationCss.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]));

    for (const [, token, value] of animateTokens) {
      const keyframe = value.trim().split(/\s+/)[0];
      expect(defined.has(keyframe), `${token} references ${keyframe}, which animation.css does not define`).toBe(true);
    }
  });

  it('each compose a duration/easing token rather than a literal timing', () => {
    for (const [, token, value] of animateTokens) {
      expect(value, `${token} must route through --duration-*/--transition-*/--ease-*`).toMatch(
        /var\(--(duration|transition|ease)-/,
      );
    }
  });

  it('cover the keyframes animation.css ships', () => {
    const animated = new Set(animateTokens.map(([, , value]) => value.trim().split(/\s+/)[0]));

    for (const keyframe of ['spin', 'pulse', 'ping', 'bounce', 'progress-bar', 'fade-in-up', 'scale-in']) {
      expect(animated.has(keyframe), `no --animate-* token wraps ${keyframe}`).toBe(true);
    }
  });
});

describe('reduced motion', () => {
  const mediaBlock = themeCss.match(
    /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-motion='full'\]\) \{([^}]+)\}/,
  );
  const forcedBlock = themeCss.match(/:root\[data-motion='reduced'\] \{([^}]+)\}/);

  it('has both blocks: OS preference and app-forced reduction', () => {
    expect(mediaBlock, 'media-query block gated by :not([data-motion=full])').toBeDefined();
    expect(forcedBlock, ":root[data-motion='reduced'] block").toBeDefined();
  });

  it('keeps the two declaration lists identical', () => {
    const normalize = (body: string) =>
      [...body.matchAll(/--[\w-]+:\s*[^;]+;/g)].map((m) => m[0].replace(/\s+/g, ' ')).sort();

    expect(normalize(forcedBlock?.[1] ?? '')).toEqual(normalize(mediaBlock?.[1] ?? ''));
  });

  it('switches the --_motion-* escape hatches at :root, not in a mixin', () => {
    expect(mediaBlock?.[1]).toMatch(/--_motion-transition:\s*none;/);
    expect(mediaBlock?.[1]).toMatch(/--_motion-animation:\s*none;/);
    // The old reducedMotionMixin declared these on :host under a media query;
    // it could not honor data-motion='full', so it must not come back.
    const accessibility = readFileSync(join(stylesDir, 'mixins', 'accessibility.css.ts'), 'utf-8');
    expect(accessibility).not.toMatch(/export const reducedMotionMixin/);
    const stylesBarrel = readFileSync(join(stylesDir, 'index.ts'), 'utf-8');
    expect(stylesBarrel).not.toMatch(/reducedMotionMixin/);
  });

  it('zeroes every duration the --animate-* tokens compose', () => {
    const used = new Set(
      animateTokens.flatMap(([, , value]) =>
        [...value.matchAll(/var\(--(duration-\d+|transition-[\w-]+)\)/g)].map((m) => m[1]),
      ),
    );
    const zeroed = new Set(
      [...(forcedBlock?.[1] ?? '').matchAll(/--(duration-[\d]+|transition-[\w-]+):\s*(?:0ms|none);/g)].map((m) => m[1]),
    );

    for (const token of used) {
      expect(zeroed.has(token), `--${token} is used by an --animate-* token but not zeroed under reduced motion`).toBe(
        true,
      );
    }
  });
});

// A component animation that does not route through the --_motion-animation
// escape hatch keeps moving under prefers-reduced-motion and data-motion='reduced'
// and ignores data-motion='full'. Four shipped that way before this guard
// existed (datagrid/navbar/command-palette spinners and the marquee scroll).
// Transitions are exempt: they compose --transition-* tokens, which the Reduced
// Motion block already zeroes.
describe('component animation contract', () => {
  const srcDir = join(stylesDir, '..');

  function* walkCss(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'testing') continue;
        yield* walkCss(full);
      } else if (entry.name.endsWith('.css')) {
        yield full;
      }
    }
  }

  // styles/animation.css is the light-DOM layer: its utilities consume the
  // tokens directly and its keyframes ship globally, so it is not a component.
  const componentCss = [...walkCss(srcDir)].filter((file) => join(file) !== join(stylesDir, 'animation.css'));

  it('every component animation honors the escape hatch', () => {
    for (const file of componentCss) {
      const source = readFileSync(file, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');

      for (const match of source.matchAll(/animation:\s*([^;]+);/g)) {
        // Collapse whitespace and any newline the formatter put after `var(`, so
        // a wrapped multi-line declaration compares the same as an inline one.
        const value = match[1]
          .replace(/\s+/g, ' ')
          .replace(/var\(\s+/g, 'var(')
          .trim();

        expect(
          value.startsWith('var(--_motion-animation,') || value === 'none',
          `${file.slice(srcDir.length + 1)} animates without the --_motion-animation hatch: "${value}"`,
        ).toBe(true);
      }
    }
  });
});
