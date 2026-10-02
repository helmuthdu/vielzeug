import { type StatusDefinition, statusRule } from '../../../content';
import type { Terrain, TerrainRule } from '../../../domain/types';

/** What the board rule drawer shows: one token, status or terrain with its full rulebook text. */
export interface BoardRule {
  art: string | null;
  /** Whether the rule's gameplay effect has been verified. */
  available: boolean;
  /** The short hint/timing shown as a subtitle chip. Null when no timing applies. */
  hint: string | null;
  icon: string;
  name: string;
  /** Structured breakdown of the rule: each part shown as its own highlighted paragraph. */
  parts: readonly RulePart[];
}

export interface RulePart {
  /** Translation key for the label, e.g. "tokenRule.when". Empty string for unlabeled notes. */
  labelKey: string;
  text: string;
  /** Whether this part is the trigger/condition (highlighted) vs the effect (muted). */
  tone: 'trigger' | 'effect' | 'note';
}

// Glossary entry first; content-carried rule text covers tokens the generated glossary lacks.
export const statusBoardRule = (status: StatusDefinition): BoardRule => {
  const text = statusRule(status)?.text ?? status.rule;
  const parts: RulePart[] = [];
  if (text) parts.push({ labelKey: 'tokenRule.effect', text, tone: 'effect' });
  return {
    art: status.art,
    available: text !== null,
    hint: status.hint,
    icon: status.icon,
    name: status.name,
    parts,
  };
};

// Timing is the subtitle, effect and details are the broken-down body.
export const terrainBoardRule = ({ icon, name, rule }: Terrain): BoardRule => buildTerrainBoardRule(icon, name, rule);

export const battlefieldObjectBoardRule = (icon: string, name: string, rule: TerrainRule): BoardRule =>
  buildTerrainBoardRule(icon, name, rule);

function buildTerrainBoardRule(icon: string | null, name: string, rule: TerrainRule): BoardRule {
  const parts: RulePart[] = [];
  if (rule.condition) parts.push({ labelKey: 'tokenRule.if', text: rule.condition, tone: 'trigger' });
  if (rule.effect) parts.push({ labelKey: 'tokenRule.effect', text: rule.effect, tone: 'effect' });
  for (const detail of rule.details) parts.push({ labelKey: '', text: detail, tone: 'note' });

  return {
    art: icon,
    available: rule.status === 'verified',
    hint: rule.timing,
    icon: 'mountain',
    name,
    parts,
  };
}
