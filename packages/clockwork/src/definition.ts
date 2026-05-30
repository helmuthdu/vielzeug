import type { MachineConfig, MachineEvent, StateNode, TransitionDef } from './types.js';

import { MachineError } from './errors.js';

// ── Hierarchy helpers ────────────────────────────────────────────────────────

/**
 * Resolves a target state to its deepest initial leaf.
 * For compound states (those with `states` + `initial`), recursively descends.
 * Returns the full dot-path to the leaf state.
 */
export const resolveLeaf = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  topLevelStates: Record<string, StateNode<State, Ctx, Ev>>,
  target: string,
): string => {
  const segments = target.split('.');
  let node: StateNode<string, Ctx, Ev> | undefined = topLevelStates[segments[0]] as
    | StateNode<string, Ctx, Ev>
    | undefined;

  if (!node) return target;

  // Walk existing segments
  for (let i = 1; i < segments.length; i++) {
    node = node.states?.[segments[i]];

    if (!node) return target;
  }

  // Descend into initial substates
  let path = target;

  while (node?.states && node.initial) {
    path = `${path}.${node.initial}`;
    node = node.states[node.initial];
  }

  return path;
};

/**
 * Returns the node at a given dot-path.
 */
export const getNodeAtPath = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  topLevelStates: Record<string, StateNode<State, Ctx, Ev>>,
  path: string,
): StateNode<string, Ctx, Ev> | undefined => {
  const segments = path.split('.');
  let node: StateNode<string, Ctx, Ev> | undefined = topLevelStates[segments[0]] as
    | StateNode<string, Ctx, Ev>
    | undefined;

  for (let i = 1; i < segments.length; i++) {
    if (!node?.states) return undefined;

    node = node.states[segments[i]];
  }

  return node;
};

/**
 * Returns ancestor paths from root to leaf (inclusive), e.g. ['a', 'a.b', 'a.b.c']
 */
export const getAncestorPaths = (path: string): string[] => {
  const segments = path.split('.');
  const paths: string[] = [];

  for (let i = 1; i <= segments.length; i++) {
    paths.push(segments.slice(0, i).join('.'));
  }

  return paths;
};

// ── Validation ───────────────────────────────────────────────────────────────

const validateNode = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  states: Record<string, StateNode<State, Ctx, Ev>>,
  node: StateNode<string, Ctx, Ev>,
  path: string,
  allTopLevel: Record<string, StateNode<State, Ctx, Ev>>,
): void => {
  // Validate compound state has initial
  if (node.states && !node.initial) {
    throw new MachineError(
      'MACHINE_MISSING_COMPOUND_INITIAL',
      `[machine] compound state "${path}" must have an "initial" property`,
      { path },
    );
  }

  if (node.initial && node.states && !(node.initial in node.states)) {
    throw new MachineError(
      'MACHINE_INVALID_INITIAL_STATE',
      `[machine] compound state "${path}" initial "${node.initial}" not found in substates`,
      { initial: node.initial, path },
    );
  }

  // Validate transitions
  for (const [eventType, input] of Object.entries(node.on ?? {})) {
    const defs = Array.isArray(input) ? input : [input];

    if (defs.length === 0) {
      throw new MachineError(
        'MACHINE_INVALID_TRANSITION_ARRAY',
        `[machine] state "${path}" event "${eventType}" must be a non-empty transition or transition array`,
        { eventType, path },
      );
    }

    for (const tr of defs as Array<TransitionDef<State, Ctx, Ev>>) {
      // Target must be resolvable: either a top-level state or a dot-path
      const targetRoot = tr.target.split('.')[0];

      if (!(targetRoot in allTopLevel)) {
        throw new MachineError(
          'MACHINE_UNKNOWN_TARGET',
          `[machine] state "${path}" event "${eventType}" targets unknown state "${tr.target}"`,
          { eventType, path, target: tr.target },
        );
      }
    }
  }

  // Recurse into substates
  if (node.states) {
    for (const [name, child] of Object.entries(node.states)) {
      validateNode(states, child, `${path}.${name}`, allTopLevel);
    }
  }
};

const validateDefinition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineConfig<State, Ctx, Ev>,
): void => {
  const { states } = definition;

  if (!(definition.initial in states)) {
    throw new MachineError(
      'MACHINE_INVALID_INITIAL_STATE',
      `[machine] initial state "${definition.initial}" not found in states`,
      { initial: definition.initial },
    );
  }

  for (const [stateName, node] of Object.entries(states) as Array<[string, StateNode<State, Ctx, Ev>]>) {
    validateNode(states, node, stateName, states);
  }
};

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Defines a state machine configuration with full validation and type inference.
 * @example
 * const machine = defineMachine({
 *   initial: 'idle',
 *   states: { idle: { on: { GO: { target: 'active' } } }, active: {} },
 * });
 */
export const defineMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): Readonly<MachineConfig<State, Ctx, Ev>> => {
  validateDefinition(config);

  return config;
};
