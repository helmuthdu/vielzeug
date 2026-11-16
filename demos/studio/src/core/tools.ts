import { defineMachine } from '@vielzeug/clockwork';

export type BoardTool = 'draw' | 'pan' | 'select';

export type ToolContext = { previous: BoardTool };

export type ToolEvent =
  | { type: 'DRAW_TOOL' }
  | { type: 'PAN_TOOL' }
  | { type: 'SELECT_TOOL' }
  | { type: 'TEMP_PAN_END' }
  | { type: 'TEMP_PAN_START' };

/**
 * Board tool state. Holding space enters `pan` transiently; each source state
 * records itself in context so releasing space returns to the tool the user was
 * actually on, instead of scattering boolean flags through event handlers.
 */
const machine = defineMachine<ToolContext, ToolEvent>()({
  context: { previous: 'select' },
  initial: 'select',
  states: {
    draw: {
      on: {
        PAN_TOOL: { target: 'pan' },
        SELECT_TOOL: { target: 'select' },
        TEMP_PAN_START: { reduce: () => ({ previous: 'draw' }), target: 'pan' },
      },
    },
    pan: {
      on: {
        DRAW_TOOL: { target: 'draw' },
        SELECT_TOOL: { target: 'select' },
        TEMP_PAN_END: [{ guard: ({ context }) => context.previous === 'draw', target: 'draw' }, { target: 'select' }],
      },
    },
    select: {
      on: {
        DRAW_TOOL: { target: 'draw' },
        PAN_TOOL: { target: 'pan' },
        TEMP_PAN_START: { reduce: () => ({ previous: 'select' }), target: 'pan' },
      },
    },
  },
});

export type ToolActor = ReturnType<(typeof machine)['createActor']>;

export function createToolActor(): ToolActor {
  return machine.createActor();
}
