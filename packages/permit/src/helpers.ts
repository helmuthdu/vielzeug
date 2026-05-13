import type { PermitPredicate } from './types';

/**
 * Creates a predicate for checking ownership: matches when the principal's ID
 * equals a specific field value in the data object.
 *
 * Common RBAC pattern: allow an editor to update only their own posts.
 *
 * @example
 * ```ts
 * permit.set({
 *   role: 'editor',
 *   resource: 'posts',
 *   action: 'update',
 *   effect: 'allow',
 *   when: owns('authorId'),
 * });
 *
 * // Allows if: principal.id === data.authorId
 * permit.can(editor, 'posts', 'update', { authorId: editor.id }); // true
 * ```
 */
export function owns<TData = unknown>(attributeKey: keyof TData & string): PermitPredicate<TData> {
  return ({ data, principal }) => {
    if (!data || typeof data !== 'object') return false;

    const value = (data as Record<string, unknown>)[attributeKey];

    return principal.id === value;
  };
}
