import { describe, expect, it } from 'vitest';

import { createToolActor } from '../tools.ts';

describe('tool machine', () => {
  it('starts in select and switches tools explicitly', () => {
    const actor = createToolActor();
    expect(actor.snapshot.state).toBe('select');
    actor.send({ type: 'DRAW_TOOL' });
    expect(actor.snapshot.state).toBe('draw');
    actor.send({ type: 'PAN_TOOL' });
    expect(actor.snapshot.state).toBe('pan');
  });

  it('returns to the originating tool when space-pan ends', () => {
    const actor = createToolActor();
    actor.send({ type: 'DRAW_TOOL' });
    actor.send({ type: 'TEMP_PAN_START' });
    expect(actor.snapshot.state).toBe('pan');
    actor.send({ type: 'TEMP_PAN_END' });
    expect(actor.snapshot.state).toBe('draw');
  });

  it('switches to pen and back', () => {
    const actor = createToolActor();
    actor.send({ type: 'PEN_TOOL' });
    expect(actor.snapshot.state).toBe('pen');
    actor.send({ type: 'SELECT_TOOL' });
    expect(actor.snapshot.state).toBe('select');
  });

  it('space-pan from pen returns to pen', () => {
    const actor = createToolActor();
    actor.send({ type: 'PEN_TOOL' });
    actor.send({ type: 'TEMP_PAN_START' });
    expect(actor.snapshot.state).toBe('pan');
    actor.send({ type: 'TEMP_PAN_END' });
    expect(actor.snapshot.state).toBe('pen');
  });

  it('space-pan from select returns to select', () => {
    const actor = createToolActor();
    actor.send({ type: 'TEMP_PAN_START' });
    actor.send({ type: 'TEMP_PAN_END' });
    expect(actor.snapshot.state).toBe('select');
  });

  it('ignores events the current state does not handle', () => {
    const actor = createToolActor();
    actor.send({ type: 'SELECT_TOOL' });
    expect(actor.snapshot.state).toBe('select');
    actor.send({ type: 'TEMP_PAN_END' });
    expect(actor.snapshot.state).toBe('select');
  });
});
