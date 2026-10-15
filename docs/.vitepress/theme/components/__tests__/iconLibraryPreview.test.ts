import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import fixtures from '../../../../../packages/refine/src/icons/__tests__/fixtures/iconify.json';
import { extractCodeFromSlot } from '../component-preview/vnode';
import { iconLibraryPreviewHtml } from '../icon-library-preview';

describe('local icon library preview', () => {
  it('uses the existing preview code extraction with licensed data for all three families', () => {
    const html = iconLibraryPreviewHtml();
    expect(extractCodeFromSlot([h('div', { class: 'language-html' }, [h('pre', [h('code', html)])])])?.text).toBe(html);
    for (const [prefix, name] of Object.entries({
      heroicons: 'hero-home',
      mdi: 'material-home',
      tabler: 'tabler-home',
    })) {
      expect(html).toContain(`name="${name}"`);
      expect(html).toContain(`"${prefix}"`);
      expect(html).toContain(`${prefix}Icons({`);
    }
    expect(Object.keys(fixtures)).toHaveLength(3);
    expect(html).toContain('Check: home(samples.mdi)');
    expect(html).not.toContain('iconifyIcons(');
    expect(html).toContain('label="Heroicons home"');
    expect(html).not.toContain('fetch(');
  });
});
