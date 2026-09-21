import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CodexError } from './errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Skill directories shipped in the package, in `skills/<name>/SKILL.md` layout. */
export const SKILLS_ROOT = resolve(__dirname, '../skills');

/** Directories probed, in order, when no `--target` is given. The first existing one wins; if none
 * exist the first entry is created. */
export const SKILL_TARGET_CANDIDATES = ['.agents/skills', '.github/skills', '.claude/skills'] as const;

export class SkillInstallError extends CodexError {}

export interface InstallSkillsOptions {
  /** Project root to probe for target candidates. Default: `process.cwd()`. */
  cwd?: string;
  /** Overwrite an existing skill directory. Default: `false`. */
  force?: boolean;
  /** Skill directory root to copy from. Default: {@link SKILLS_ROOT}. */
  source?: string;
  /** Explicit target skills directory (absolute or relative to `cwd`). Skips autodetection. */
  target?: string;
}

export interface InstalledSkill {
  name: string;
  path: string;
}

export function listBundledSkills(source = SKILLS_ROOT): readonly string[] {
  if (!existsSync(source)) return [];

  return readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(source, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

export function resolveSkillTarget(cwd: string, target?: string): string {
  if (target) return resolve(cwd, target);

  const existing = SKILL_TARGET_CANDIDATES.find((candidate) => existsSync(resolve(cwd, candidate)));

  return resolve(cwd, existing ?? SKILL_TARGET_CANDIDATES[0]);
}

/** Copies every bundled skill into the resolved target directory and returns what was written. */
export function installSkills(options: InstallSkillsOptions = {}): readonly InstalledSkill[] {
  const cwd = options.cwd ?? process.cwd();
  const source = options.source ?? SKILLS_ROOT;
  const names = listBundledSkills(source);

  if (names.length === 0) throw new SkillInstallError(`no bundled skills found in ${source}`);

  const targetRoot = resolveSkillTarget(cwd, options.target);
  const conflicts = names.filter((name) => existsSync(join(targetRoot, name)));

  if (conflicts.length > 0 && !options.force) {
    throw new SkillInstallError(
      `skill${conflicts.length > 1 ? 's' : ''} already installed: ${conflicts.map((name) => join(targetRoot, name)).join(', ')} (use --force to overwrite)`,
    );
  }

  mkdirSync(targetRoot, { recursive: true });

  return names.map((name) => {
    const path = join(targetRoot, name);

    cpSync(join(source, name), path, { force: true, recursive: true });

    return { name, path };
  });
}
