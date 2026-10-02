import type { UserPrincipal, WardAttributes } from '@vielzeug/ward';
import { ANONYMOUS, allow, createWard, predicate, WILDCARD } from '@vielzeug/ward';
import type { CatalogEntry } from './catalog';

/**
 * Authorization for the community catalog. The same ordered rules run in two places: the
 * UI derives its actions from them today, and the future backend enforces them (RLS or
 * Worker checks importing this module). They are the single source of truth — drift on
 * either side is a bug here, not there.
 */

export type CatalogAction = 'view' | 'import' | 'like' | 'publish' | 'republish' | 'unlike' | 'unpublish';
export type CatalogResource = 'catalog-entry';

/** The attributes decisions need: the id of the entry's author. */
export interface CatalogAttributes extends WardAttributes {
  authorId: string;
}

/** The viewer's principal: the catalog port mints it with the player role. */
export type CatalogPrincipal = UserPrincipal | null;

/**
 * Ordered rules, first match wins, default deny:
 * 1. Browsing is open to everyone — anonymous included, so the online list costs no
 *    identity until a player interacts.
 * 2. Players import and like what they view.
 * 3. Publishing is a player action; republishing and unpublishing act on an existing
 *    entry, so they stay with the entry's author.
 */
export const catalogWard = createWard<CatalogAction, CatalogResource, CatalogAttributes>([
  allow([ANONYMOUS, WILDCARD], 'catalog-entry', ['view']),
  allow('player', 'catalog-entry', ['import', 'like', 'publish', 'unlike']),
  allow('player', 'catalog-entry', ['republish', 'unpublish'], { when: predicate.owns('authorId') }),
]);

/** Decides one action against one entry (or entry-less for a new publish). */
export function catalogAllows(
  action: CatalogAction,
  principal: CatalogPrincipal,
  entry?: Pick<CatalogEntry, 'author'>,
): boolean {
  return (
    catalogWard.decide({
      action,
      attributes: { authorId: entry ? entry.author.id : (principal?.id ?? '') },
      principal,
      resource: 'catalog-entry',
    }).effect === 'allow'
  );
}

/** Every action the principal may take on one entry; drives the row and detail actions. */
export function catalogActions(principal: CatalogPrincipal, entry?: Pick<CatalogEntry, 'author'>): CatalogAction[] {
  return catalogWard.forPrincipal(principal).allowedActions({
    attributes: { authorId: entry ? entry.author.id : (principal?.id ?? '') },
    resource: 'catalog-entry',
  });
}
