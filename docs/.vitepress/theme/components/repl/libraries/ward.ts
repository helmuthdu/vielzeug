export const description = 'Role-based access control (RBAC) system for permissions.';

export const loader = () => import('@vielzeug/ward');

export const apiExports = ['createWard', 'owns', 'WILDCARD', 'ANONYMOUS'] as const;
