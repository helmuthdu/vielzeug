export const description = 'Lightweight dependency injection container with IoC principles.';

export const loader = () => import('@vielzeug/conduit');

export const apiExports = [
  'createContainer',
  'createToken',
  'createTestContainer',
  'Container',
  'CircularDependencyError',
  'ProviderNotFoundError',
  'AsyncProviderError',
  'AliasCycleError',
  'ContainerDisposedError',
] as const;
