import { describe, expect, it } from 'vitest';
import {
  buildAreas,
  buildHeading,
  buildNote,
  contactSection,
  featuredProject,
  footerLinks,
  hero,
  navLinks,
  newTabAffordance,
  philosophy,
  schemeToggle,
  site,
  studio,
  workHeading,
} from './content';

describe('site content', () => {
  it('states the positioning in the hero', () => {
    expect(hero.title).toBe(site.tagline);
    expect(hero.lede).toMatch(/thoughtful digital products/);
    expect(`${hero.titleLead} ${hero.titleAccent}`).toBe(hero.title);
    expect(hero.image).toBe('./bg_hero.jpeg');
  });

  it('keeps navigation anchors resolvable', () => {
    const ids = new Set(['work', 'about', 'contact']);
    for (const link of [...navLinks, ...footerLinks]) {
      if (link.external) continue;
      expect(ids.has(link.href.slice(1)), link.href).toBe(true);
    }
  });

  it('keeps the Vielzeug credit in the footer instead of the navbar', () => {
    expect(navLinks.some((link) => link.href === 'https://vielzeug.dev')).toBe(false);
    expect(footerLinks).toContainEqual({
      external: true,
      href: 'https://vielzeug.dev',
      label: 'Built with Vielzeug',
    });
  });

  it('presents the featured project as unofficial fan work with the required disclaimer', () => {
    expect(featuredProject.disclaimer).toContain('not affiliated with, endorsed by, or sponsored by Reggie Games');
    expect(featuredProject.badge).toBe('Fan-made project');
    expect(featuredProject.description).toContain('fan-made');
  });

  it('ships both real Journal screenshots with descriptive alt text', () => {
    for (const image of Object.values(featuredProject.images)) {
      expect(image.src).toMatch(/^\.\/projects\/app_hunters_journal_(light|dark)\.png$/);
      expect(image.alt).toContain('The Hunter’s Journal');
      expect(image.caption).toMatch(/theme$/);
    }
  });

  it('links external destinations over https', () => {
    const external = [...navLinks, ...footerLinks].filter((link) => link.external);
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) expect(link.href.startsWith('https://')).toBe(true);
    expect(featuredProject.href.startsWith('https://')).toBe(true);
    expect(studio.vielzeug.href).toBe('https://vielzeug.dev');
  });

  it('avoids invented-credibility language', () => {
    const copy = [
      site.description,
      hero.lede,
      ...philosophy.body,
      featuredProject.description,
      ...studio.body,
      studio.vielzeug.body,
      contactSection.body,
    ].join(' ');
    for (const banned of ['industry-leading', 'trusted by', 'our clients', 'award']) {
      expect(copy.toLowerCase(), banned).not.toContain(banned);
    }
  });

  it('describes the three product areas without implying every category is shipped', () => {
    expect(buildHeading).toBe('What we build');
    expect(buildAreas.map((area) => area.title)).toEqual(['Companion apps', 'Campaign tools', 'Tabletop utilities']);
    expect(buildAreas.every((area) => area.description.length > 0 && area.icon.length > 0)).toBe(true);
    expect(buildNote).toContain('Not every product category exists yet');
  });

  it('uses the existing tabletop list as chips and project details as tags', () => {
    expect(philosophy.examples).toEqual(['Campaigns', 'Characters', 'Cards', 'Resources', 'Progression', 'Rules']);
    for (const feature of featuredProject.features) {
      expect(featuredProject.description.toLowerCase()).toContain(feature.toLowerCase());
    }
  });

  it('states independence once and keeps the Vielzeug relationship to a single line', () => {
    expect(studio.body.filter((line) => line.includes('independent studio'))).toHaveLength(1);
    expect(studio.vielzeug.body).toContain('open-source TypeScript toolkit');
    expect(studio.vielzeug.body).toContain('studio’s founder');
  });

  it('supplies the work heading, new-tab affordance, and theme toggle labels from content', () => {
    expect(workHeading).toBe('Our work');
    expect(newTabAffordance).toBe('(opens in a new tab)');
    expect(schemeToggle.toDark).toMatch(/dark mode/);
    expect(schemeToggle.toLight).toMatch(/light mode/);
  });
});
