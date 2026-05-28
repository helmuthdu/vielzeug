/**
 * Component lifecycle state machine.
 *
 * Formalizes the component lifecycle as explicit const values,
 * replacing implicit boolean flags for better debuggability and clarity.
 */

export const ComponentPhase = {
  /** Setup complete; template mounted or pending mount */
  SETUP_DONE: 'setup_done',
  /** Component connected; setup function is running */
  SETUP_RUNNING: 'setup_running',
  /** Component created but not yet connected to DOM */
  UNINITIALIZED: 'uninitialized',
  /** Component disconnected from DOM; scope disposed */
  UNMOUNTED: 'unmounted',
} as const;

export type ComponentPhase = (typeof ComponentPhase)[keyof typeof ComponentPhase];
