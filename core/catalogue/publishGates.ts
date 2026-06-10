import type { CatalogueItem } from './CatalogueItem.ts';
import type { PublishGateFailed } from './errors.ts';
import { publishGateFailed } from './errors.ts';
import type { Result } from '../shared/kernel/Result.ts';
import { err, ok } from '../shared/kernel/Result.ts';

/**
 * publishGates — the pure §5 publish-gate checks. These are the
 * publish-CONDITIONAL rules that do not belong as entity invariants in
 * CatalogueItem (a draft can legitimately violate them; they only bite at
 * publish time). They are deliberately separated from CatalogueItemSchema's
 * §4 CHECKs, which hold for every row regardless of status.
 *
 * `canPublish` is PURE: it takes the item VALUE plus a `facts` bag the caller
 * (U6 publish flow) has already resolved from the DB. It never queries anything
 * itself, so it is trivially testable and reusable from both the API and any
 * batch/repair path.
 */

/**
 * Pre-resolved facts a publish decision needs but a single CatalogueItem row
 * cannot carry — the caller supplies these via DB counts (U6).
 */
export interface PublishGateFacts {
  exerciseCount: number; // # of exercise steps for this item (U6 supplies via a DB count)
  unpublishedSliceSourceCount: number; // # of song-breakdown slice steps whose source song is NOT published
}

/**
 * Decide whether `item` may be published, given the resolved `facts`. ALL gate
 * failures are accumulated (a curator should see every blocker at once, not
 * fix-one-hit-next), so the returned `PublishGateFailed.failures` may carry more
 * than one code. Returns `ok(undefined)` when every gate passes.
 *
 * Gates (spec §5 / §6 D2):
 *   (a) lesson-needs-at-least-one-exercise — a lesson with no steps is unplayable.
 *   (b) curated-item-needs-license — a curated item must declare its license.
 *   (c) only-curated-can-publish — the v1 shared catalogue is curated-only; a
 *       user-upload can never publish here.
 *   (d) song-breakdown-source-not-published — a lesson must not publish while any
 *       song-breakdown slice points at a non-published source song.
 */
export const canPublish = (
  item: CatalogueItem,
  facts: PublishGateFacts,
): Result<void, PublishGateFailed> => {
  // The gate codes below are stable (locked by spec §5). When the admin-UI
  // failure-message mapper lands, promote them to a typed `PublishGateCode`
  // union so the mapper stays exhaustive and typos are caught at compile time.
  const failures: string[] = [];

  // (a) a lesson must have at least one exercise step to be playable.
  if (item.type === 'lesson' && facts.exerciseCount < 1) {
    failures.push('lesson-needs-at-least-one-exercise');
  }

  // (b) a curated item must declare a license before it goes live.
  if (item.source === 'curated' && item.license == null) {
    failures.push('curated-item-needs-license');
  }

  // (c) the v1 shared catalogue is curated-only — a user-upload can never publish here.
  if (item.source !== 'curated') {
    failures.push('only-curated-can-publish');
  }

  // (d) a lesson must not publish while any song-breakdown slice's source song is unpublished.
  if (item.type === 'lesson' && facts.unpublishedSliceSourceCount > 0) {
    failures.push('song-breakdown-source-not-published');
  }

  return failures.length === 0 ? ok(undefined) : err(publishGateFailed(failures));
};
