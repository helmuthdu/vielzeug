import type { MachineConfig, MachineEvent, StateNode, TransitionDef } from './types.js';

import {
  ClockworkInvalidAfterDelayError,
  ClockworkInvalidInitialStateError,
  ClockworkInvalidTransitionArrayError,
  ClockworkMissingCompoundInitialError,
  ClockworkUnknownTargetError,
} from './errors.js';

// ── Hierarchy helpers (internal — not re-exported from index) ─────────────────

/**
 * Resolves a target state to its deepest initial leaf.
 * For compound states (those with `states` + `initial`), recursively descends.
 */
export const resolveLeaf = <Ctx extends object, Ev extends MachineEvent>(
  topLevelStates: Record<string, StateNode<string, Ctx, Ev>>,
  target: string,
): string => {
  const segments = target.split('.');
  let node: StateNode<string, Ctx, Ev> | undefined = topLevelStates[segments[0]] as
    | StateNode<string, Ctx, Ev>
    | undefined;

  if (!node) return target;

  for (let i = 1; i < segments.length; i++) {
    node = node.states?.[segments[i]];

    if (!node) return target;
  }

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
export const getNodeAtPath = <Ctx extends object, Ev extends MachineEvent>(
  topLevelStates: Record<string, StateNode<string, Ctx, Ev>>,
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
  node: StateNode<string, Ctx, Ev>,
  path: string,
  allTopLevel: Record<string, StateNode<State, Ctx, Ev>>,
): void => {
  if (node.states && !node.initial) {
    throw new ClockworkMissingCompoundInitialError(`compound state "${path}" must have an "initial" property`, path);
  }

  if (node.initial && node.states && !(node.initial in node.states)) {
    throw new ClockworkInvalidInitialStateError(
      `compound state "${path}" initial "${node.initial}" not found in substates`,
      path,
      node.initial,
    );
  }

  for (const [eventType, input] of Object.entries(node.on ?? {})) {
    const defs = Array.isArray(input) ? input : [input];

    if (defs.length === 0) {
      throw new ClockworkInvalidTransitionArrayError(
        `state "${path}" event "${eventType}" must be a non-empty transition or transition array`,
        path,
        eventType,
      );
    }

    for (const tr of defs as Array<TransitionDef<State, Ctx, Ev>>) {
      const targetRoot = tr.target.split('.')[0];

      if (!(targetRoot in allTopLevel)) {
        throw new ClockworkUnknownTargetError(
          `state "${path}" event "${eventType}" targets unknown state "${tr.target}"`,
          path,
          tr.target,
          eventType,
        );
      }

      if (tr.target.includes('.') && !getNodeAtPath(allTopLevel, tr.target)) {
        throw new ClockworkUnknownTargetError(
          `state "${path}" event "${eventType}" targets unknown nested state "${tr.target}"`,
          path,
          tr.target,
          eventType,
        );
      }
    }
  }

  // Validate empty invoke array (D1)
  if (node.invoke !== undefined && node.invoke.length === 0) {
    throw new ClockworkInvalidTransitionArrayError(`state "${path}" invoke must be a non-empty array`, path);
  }

  // Validate after targets and delays
  for (const afterDef of node.after ?? []) {
    if (!Number.isFinite(afterDef.delay) || afterDef.delay < 0) {
      throw new ClockworkInvalidAfterDelayError(
        `state "${path}" after delay must be a finite number >= 0, got ${afterDef.delay}`,
        path,
        afterDef.delay,
      );
    }

    const targetRoot = afterDef.target.split('.')[0];

    if (!(targetRoot in allTopLevel)) {
      throw new ClockworkUnknownTargetError(
        `state "${path}" after[${afterDef.delay}ms] targets unknown state "${afterDef.target}"`,
        path,
        afterDef.target,
      );
    }

    if (afterDef.target.includes('.') && !getNodeAtPath(allTopLevel, afterDef.target)) {
      throw new ClockworkUnknownTargetError(
        `state "${path}" after[${afterDef.delay}ms] targets unknown nested state "${afterDef.target}"`,
        path,
        afterDef.target,
      );
    }
  }

  if (node.states) {
    for (const [name, child] of Object.entries(node.states)) {
      validateNode(child, `${path}.${name}`, allTopLevel);
    }
  }
};

export const validateDefinition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineConfig<State, Ctx, Ev>,
): void => {
  const { states } = definition;

  if (!(definition.initial in states)) {
    throw new ClockworkInvalidInitialStateError(
      `initial state "${definition.initial}" not found in states`,
      '',
      definition.initial,
    );
  }

  for (const [stateName, node] of Object.entries(states) as Array<[string, StateNode<State, Ctx, Ev>]>) {
    validateNode(node, stateName, states);
  }
};
