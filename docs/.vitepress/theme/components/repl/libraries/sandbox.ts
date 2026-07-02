export const description = 'Sandboxed iframe runtime with typed postMessage state bridge.';

export const loader = () => import('@vielzeug/sandbox');

export const apiExports = ['createSandbox', 'buildCsp', 'buildDocument', 'SandboxError'] as const;
