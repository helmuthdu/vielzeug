/**
 * Component lifecycle state machine.
 *
 * Formalizes the component lifecycle as explicit const values,
 * replacing implicit boolean flags for better debuggability and clarity.
 */

export const ComponentPhase = {
  /** Component created but not yet connected to DOM */
  UNINITIALIZED: 'uninitialized',
  /** Component connected; setup function is running */
  SETUP_RUNNING: 'setup_running',
  /** Setup complete; template mounted or pending mount */
  SETUP_DONE: 'setup_done',
  /** Component disconnected from DOM; scope disposed */
  UNMOUNTED: 'unmounted',
} as const;

export type ComponentPhase = (typeof ComponentPhase)[keyof typeof ComponentPhase];

export type LifecycleTransition = {
  from: ComponentPhase;
  to: ComponentPhase;
  reason: string;
};

/**
 * Lifecycle state machine validator.
 * Ensures transitions follow the valid lifecycle.
 */
export const isValidTransition = (from: ComponentPhase, to: ComponentPhase): boolean => {
  const validTransitions: Record<ComponentPhase, readonly ComponentPhase[]> = {
    [ComponentPhase.UNINITIALIZED]: [ComponentPhase.SETUP_RUNNING],
    [ComponentPhase.SETUP_RUNNING]: [ComponentPhase.SETUP_DONE],
    [ComponentPhase.SETUP_DONE]: [ComponentPhase.SETUP_DONE, ComponentPhase.UNMOUNTED],
    [ComponentPhase.UNMOUNTED]: [ComponentPhase.SETUP_RUNNING],
  };

  return validTransitions[from]?.includes(to) ?? false;
};
