import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { installSkills, listBundledSkills, resolveSkillTarget, SKILLS_ROOT, SkillInstallError } from '../skills.js';

let root: string;
let source: string;

function writeSkill(name: string, body = `---\nname: ${name}\n---\n`): void {
  mkdirSync(join(source, name), { recursive: true });
  writeFileSync(join(source, name, 'SKILL.md'), body);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'codex-skills-'));
  source = join(root, 'source');
  mkdirSync(source);
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe('listBundledSkills()', () => {
  it('lists only directories that contain a SKILL.md', () => {
    writeSkill('vielzeug');
    mkdirSync(join(source, 'empty'));

    expect(listBundledSkills(source)).toEqual(['vielzeug']);
  });

  it('ships the vielzeug skill in the package', () => {
    expect(listBundledSkills(SKILLS_ROOT)).toContain('vielzeug');
  });
});

describe('resolveSkillTarget()', () => {
  it('prefers an explicit target', () => {
    expect(resolveSkillTarget(root, 'custom/skills')).toBe(join(root, 'custom/skills'));
  });

  it('picks the first existing candidate directory', () => {
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    mkdirSync(join(root, '.github/skills'), { recursive: true });

    expect(resolveSkillTarget(root)).toBe(join(root, '.github/skills'));
  });

  it('falls back to .agents/skills when nothing exists', () => {
    expect(resolveSkillTarget(root)).toBe(join(root, '.agents/skills'));
  });
});

describe('installSkills()', () => {
  it('copies every bundled skill into the autodetected target', () => {
    writeSkill('vielzeug', 'skill body');
    const cwd = join(root, 'project');
    mkdirSync(cwd);

    const installed = installSkills({ cwd, source });

    expect(installed).toEqual([{ name: 'vielzeug', path: join(cwd, '.agents/skills/vielzeug') }]);
    expect(readFileSync(join(cwd, '.agents/skills/vielzeug/SKILL.md'), 'utf8')).toBe('skill body');
  });

  it('refuses to overwrite without force and overwrites with it', () => {
    writeSkill('vielzeug', 'new');
    const cwd = join(root, 'project');
    mkdirSync(join(cwd, '.github/skills/vielzeug'), { recursive: true });
    writeFileSync(join(cwd, '.github/skills/vielzeug/SKILL.md'), 'old');

    expect(() => installSkills({ cwd, source })).toThrow(SkillInstallError);
    expect(readFileSync(join(cwd, '.github/skills/vielzeug/SKILL.md'), 'utf8')).toBe('old');

    installSkills({ cwd, force: true, source });

    expect(readFileSync(join(cwd, '.github/skills/vielzeug/SKILL.md'), 'utf8')).toBe('new');
  });

  it('fails when the source has no skills', () => {
    expect(() => installSkills({ cwd: root, source })).toThrow(/no bundled skills/);
    expect(existsSync(join(root, '.agents'))).toBe(false);
  });
});
