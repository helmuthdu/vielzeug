export const description = 'Typed finite state machines with guards, async invokes, and more.';

export const loader = () => import('@vielzeug/clockwork');

export const apiExports = ['defineMachine', 'interpret', 'resolveTransition', 'MachineError'] as const;
