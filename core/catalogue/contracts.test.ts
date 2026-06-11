import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  itemNotFound,
  itemAlreadyExists,
  staleUpdate,
  sourceNotAvailable,
  validationError,
  repositoryError,
} from './errors.ts';
import type { CatalogueError } from './errors.ts';
import type { CatalogueEvent } from './CatalogueEvent.ts';
import type { DetectedFormat } from './FileRules.ts';
import { toCatalogueItemId } from './ids.ts';

/**
 * Contracts smoke test — types-only unit; `tsc -b` is the real gate. This just
 * proves the new error constructors and the event union are runtime-constructible
 * and carry the expected discriminant. No adapters are mocked.
 *
 * The port interfaces (CatalogueRepository, PatternRepository, CatalogueFileStore,
 * FileValidator, EventSink) are NOT referenced here — `tsc -b` compiles every file
 * in the package's `include` glob, so it already proves they are well-formed; and
 * they cannot be dependency-cruiser orphans (each has outgoing imports). They will
 * gain real importers when the U4 adapters implement them.
 */

describe('catalogue contracts — U2.7 errors + events', () => {
  describe('new error members carry their kind discriminant', () => {
    test('ItemNotFound', () => {
      const e = itemNotFound('song-foo');
      assert.equal(e.kind, 'ItemNotFound');
      assert.equal(e.id, 'song-foo');
    });

    test('ItemAlreadyExists', () => {
      const e = itemAlreadyExists('song-foo');
      assert.equal(e.kind, 'ItemAlreadyExists');
      assert.equal(e.id, 'song-foo');
    });

    test('StaleUpdate (with both tokens)', () => {
      const e = staleUpdate('song-foo', '2026-06-11T10:00:00.000Z', '2026-06-11T10:05:00.000Z');
      assert.equal(e.kind, 'StaleUpdate');
      assert.equal(e.id, 'song-foo');
      assert.equal(e.expectedUpdatedAt, '2026-06-11T10:00:00.000Z');
      assert.equal(e.actualUpdatedAt, '2026-06-11T10:05:00.000Z');
    });

    test('SourceNotAvailable', () => {
      const e = sourceNotAvailable('source-song-not-published');
      assert.equal(e.kind, 'SourceNotAvailable');
      assert.equal(e.detail, 'source-song-not-published');
    });

    test('ValidationError', () => {
      const e = validationError(['bpm: required', 'title: too long']);
      assert.equal(e.kind, 'ValidationError');
      assert.deepEqual(e.issues, ['bpm: required', 'title: too long']);
    });

    test('RepositoryError', () => {
      const e = repositoryError('connection-lost');
      assert.equal(e.kind, 'RepositoryError');
      assert.equal(e.detail, 'connection-lost');
    });

    test('CatalogueError union narrows on kind', () => {
      const errs: CatalogueError[] = [
        itemNotFound('x'),
        itemAlreadyExists('x'),
        staleUpdate('x'),
        sourceNotAvailable(),
        validationError([]),
        repositoryError(),
      ];
      const kinds = errs.map((e) => e.kind);
      assert.deepEqual(kinds, [
        'ItemNotFound',
        'ItemAlreadyExists',
        'StaleUpdate',
        'SourceNotAvailable',
        'ValidationError',
        'RepositoryError',
      ]);
    });
  });

  describe('CatalogueEvent variants carry their type discriminant', () => {
    const itemId = toCatalogueItemId('song-foo');
    const occurredAt = '2026-06-11T10:00:00.000Z';
    const format: DetectedFormat = { kind: 'notation', format: 'gp' };

    test('catalogue_item.created', () => {
      const ev: CatalogueEvent = {
        type: 'catalogue_item.created',
        itemId,
        itemType: 'song',
        occurredAt,
      };
      assert.equal(ev.type, 'catalogue_item.created');
    });

    test('catalogue_item.updated', () => {
      const ev: CatalogueEvent = {
        type: 'catalogue_item.updated',
        itemId,
        itemType: 'song',
        occurredAt,
      };
      assert.equal(ev.type, 'catalogue_item.updated');
    });

    test('catalogue_item.published', () => {
      const ev: CatalogueEvent = {
        type: 'catalogue_item.published',
        itemId,
        itemType: 'lesson',
        occurredAt,
      };
      assert.equal(ev.type, 'catalogue_item.published');
    });

    test('catalogue_item.archived', () => {
      const ev: CatalogueEvent = {
        type: 'catalogue_item.archived',
        itemId,
        itemType: 'lesson',
        occurredAt,
      };
      assert.equal(ev.type, 'catalogue_item.archived');
    });

    test('catalogue_item.file.validated', () => {
      const ev: CatalogueEvent = {
        type: 'catalogue_item.file.validated',
        itemId,
        format,
        notationKey: 'catalogue/song-foo/notation.gp',
        occurredAt,
      };
      assert.equal(ev.type, 'catalogue_item.file.validated');
      assert.equal(ev.format.kind, 'notation');
    });
  });
});
