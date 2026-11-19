import { describe, expect, it } from 'vitest';

import {
  cellKey,
  createEncounterModel,
  emptyEncounter,
  FOV_RADIUS,
  inBounds,
  stateCommand,
  topologyFor,
  WORLD_RADIUS,
} from '../encounter.ts';

describe('topologyFor', () => {
  it('gives square grids four orthogonal neighbors', () => {
    const topology = topologyFor('square');
    expect(new Set(topology.neighbors({ q: 0, r: 0 }).map((c) => `${String(c.q)}:${String(c.r)}`))).toEqual(
      new Set(['0:-1', '1:0', '0:1', '-1:0']),
    );
    expect(topology.distance({ q: -2, r: 3 }, { q: 1, r: -1 })).toBe(7);
  });

  it('gives hex grids six neighbors and hex distance', () => {
    const topology = topologyFor('hex');
    expect(topology.neighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(topology.distance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
  });

  it('keys cells identically on both grids', () => {
    expect(topologyFor('square').key({ q: 1, r: -2 })).toBe('1:-2');
    expect(topologyFor('hex').key({ q: 1, r: -2 })).toBe('1:-2');
  });
});

describe('inBounds', () => {
  it('bounds the world at WORLD_RADIUS on both axes', () => {
    expect(inBounds({ q: WORLD_RADIUS, r: -WORLD_RADIUS })).toBe(true);
    expect(inBounds({ q: WORLD_RADIUS + 1, r: 0 })).toBe(false);
  });
});

describe('encounter model', () => {
  it('replaces state and notifies subscribers', () => {
    using model = createEncounterModel();
    let notifications = 0;
    model.subscribe(() => (notifications += 1));
    const next = {
      ...emptyEncounter('hex'),
      units: [{ id: 'h1', move: 3, name: 'A', q: 0, r: 0, range: 1, team: 'hero' as const }],
    };
    model.replace(next);
    expect(model.state).toBe(next);
    expect(notifications).toBe(1);
    expect(model.topology).toBe(topologyFor('hex'));
  });

  it('canStand rejects blocked cells and off-world cells', () => {
    using model = createEncounterModel();
    model.replace({ ...emptyEncounter(), blocked: ['1:0'] });
    expect(model.canStand({ q: 0, r: 0 })).toBe(true);
    expect(model.canStand({ q: 1, r: 0 })).toBe(false);
    expect(model.canStand({ q: WORLD_RADIUS + 5, r: 0 })).toBe(false);
  });

  it('unitAt finds the unit on a cell', () => {
    using model = createEncounterModel();
    model.replace({
      ...emptyEncounter(),
      units: [{ id: 'h1', move: 3, name: 'A', q: 2, r: 2, range: 1, team: 'hero' }],
    });
    expect(model.unitAt({ q: 2, r: 2 })?.id).toBe('h1');
    expect(model.unitAt({ q: 2, r: 3 })).toBeUndefined();
  });

  it('fog is off by default: every cell is visible', () => {
    using model = createEncounterModel();
    expect(model.fogEnabled).toBe(false);
    expect(model.fogState({ q: 20, r: 20 })).toBe('visible');
  });

  it('fog reveals around heroes and remembers what was seen', () => {
    using model = createEncounterModel();
    const hero = { id: 'h1', move: 3, name: 'A', q: 0, r: 0, range: 1, team: 'hero' as const };
    model.replace({ ...emptyEncounter(), units: [hero] });
    model.setFog(true);
    expect(model.fogState({ q: 0, r: 0 })).toBe('visible');
    expect(model.fogState({ q: FOV_RADIUS, r: 0 })).toBe('visible');
    expect(model.fogState({ q: FOV_RADIUS + 3, r: 0 })).toBe('unseen');
    // Move the hero; the old area stays 'seen', the new area becomes visible.
    model.replace({
      ...emptyEncounter(),
      units: [{ ...hero, q: FOV_RADIUS * 3, r: 0 }],
    });
    expect(model.fogState({ q: 0, r: 0 })).toBe('seen');
    expect(model.fogState({ q: FOV_RADIUS * 3, r: 0 })).toBe('visible');
  });

  it('fog works on hex grids', () => {
    using model = createEncounterModel();
    model.replace({
      ...emptyEncounter('hex'),
      units: [{ id: 'h1', move: 3, name: 'A', q: 0, r: 0, range: 1, team: 'hero' }],
    });
    model.setFog(true);
    expect(model.fogState({ q: 0, r: 0 })).toBe('visible');
    expect(model.fogState({ q: FOV_RADIUS, r: 0 })).toBe('visible');
    expect(model.fogState({ q: FOV_RADIUS + 4, r: 0 })).toBe('unseen');
  });

  it('fog round-trips through export/import', () => {
    using source = createEncounterModel();
    using twin = createEncounterModel();
    source.replace({
      ...emptyEncounter(),
      units: [{ id: 'h1', move: 3, name: 'A', q: 0, r: 0, range: 1, team: 'hero' }],
    });
    source.setFog(true);
    twin.importFog(source.exportFog());
    twin.replace(source.state);
    expect(twin.fogEnabled).toBe(true);
    expect(twin.fogState({ q: 0, r: 0 })).toBe('visible');
    expect(twin.fogState({ q: FOV_RADIUS + 3, r: 0 })).toBe('unseen');
  });

  it('terrainKind is deterministic per cell', () => {
    using a = createEncounterModel();
    using b = createEncounterModel();
    expect(a.terrainKind({ q: 3, r: -7 })).toBe(b.terrainKind({ q: 3, r: -7 }));
    a.replace({ ...emptyEncounter(), blocked: ['3:-7'] });
    expect(a.terrainKind({ q: 3, r: -7 })).toBe('wall');
  });
});

describe('stateCommand', () => {
  it('applies and reverts whole-state transitions', () => {
    using model = createEncounterModel();
    const before = model.state;
    const after = { ...emptyEncounter(), blocked: [cellKey({ q: 1, r: 1 })] };
    const command = stateCommand(model, 'Paint blocker', before, after);
    const ctx = { signal: new AbortController().signal };
    command.apply(ctx);
    expect(model.state.blocked).toEqual(['1:1']);
    command.revert(ctx);
    expect(model.state).toBe(before);
    expect(command.label).toBe('Paint blocker');
  });
});
