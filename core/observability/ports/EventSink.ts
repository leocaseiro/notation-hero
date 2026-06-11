import type { Result } from '../../shared/kernel/Result.ts';
import type { CatalogueEvent } from '../../catalogue/CatalogueEvent.ts';
import type { RepositoryError } from '../../catalogue/errors.ts';

/**
 * EventSink — the PUBLISH port for domain events. U4's `adapters/sns`
 * (`SnsEventSink`) implements it; core declares only the contract. A publish
 * failure surfaces as `RepositoryError` (the infra catch-all) so callers handle
 * it as a value, never a throw.
 *
 * This lives in `core/observability/` — a sibling bounded-context dir to
 * `core/catalogue/` — but stays pure: no I/O, types only. It reaches across to
 * the catalogue's `CatalogueEvent` shape because the event contract is owned by
 * the catalogue; the sink is the transport-neutral way to emit it.
 */
export interface EventSink {
  publish(event: CatalogueEvent): Promise<Result<void, RepositoryError>>;
}
