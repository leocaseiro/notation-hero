import type { CatalogueItemId } from './ids.ts';
import type { ItemType } from './CatalogueItem.ts';
import type { DetectedFormat } from './FileRules.ts';

/**
 * CatalogueEvent — the domain event contract the catalogue PUBLISHES (via the
 * `EventSink` port; U4's SNS adapter carries them). H-6 subscribes downstream,
 * so the payloads are deliberately MINIMAL and STABLE: a discriminated union on
 * a `type` string literal, each carrying only the ids/facts a subscriber needs
 * plus an ISO `occurredAt`. TYPES ONLY — no Zod, no runtime here.
 *
 * Lifecycle events (`created`/`updated`/`published`/`archived`) share one
 * payload shape; the file-validated event additionally carries the detected
 * format and the stored notation key.
 */

/** The five `type` discriminant values, as a string-literal union. */
export type CatalogueEventType =
  | 'catalogue_item.created'
  | 'catalogue_item.updated'
  | 'catalogue_item.published'
  | 'catalogue_item.archived'
  | 'catalogue_item.file.validated';

/** Shared payload for the four item-lifecycle events. */
export interface CatalogueItemCreated {
  type: 'catalogue_item.created';
  itemId: CatalogueItemId;
  itemType: ItemType;
  occurredAt: string; // ISO
}

export interface CatalogueItemUpdated {
  type: 'catalogue_item.updated';
  itemId: CatalogueItemId;
  itemType: ItemType;
  occurredAt: string; // ISO
}

export interface CatalogueItemPublished {
  type: 'catalogue_item.published';
  itemId: CatalogueItemId;
  itemType: ItemType;
  occurredAt: string; // ISO
}

export interface CatalogueItemArchived {
  type: 'catalogue_item.archived';
  itemId: CatalogueItemId;
  itemType: ItemType;
  occurredAt: string; // ISO
}

/** A file passed validation and was stored — carries the format + notation key. */
export interface CatalogueItemFileValidated {
  type: 'catalogue_item.file.validated';
  itemId: CatalogueItemId;
  format: DetectedFormat;
  notationKey: string;
  occurredAt: string; // ISO
}

/** CatalogueEvent — the union of every catalogue domain event. */
export type CatalogueEvent =
  | CatalogueItemCreated
  | CatalogueItemUpdated
  | CatalogueItemPublished
  | CatalogueItemArchived
  | CatalogueItemFileValidated;
