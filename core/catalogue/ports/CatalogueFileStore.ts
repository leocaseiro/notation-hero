import type { Result } from '../../shared/kernel/Result.ts';
import type { RepositoryError, SourceNotAvailable } from '../errors.ts';

/**
 * CatalogueFileStore — the S3 file-lifecycle PORT (spec §2 / §8 / §10). U4's
 * `adapters/s3` implements it; core declares only the contract.
 *
 * The lifecycle: a curator first uploads INTO a quarantine prefix via a
 * presigned target (`mintUploadTarget`), the file is validated, then a clean
 * file is PROMOTED out of quarantine into the served `catalogue/<id>/…` prefix
 * (`promote`). Serving a stored file uses a short-lived CloudFront-signed READ
 * url (`mintSignedReadUrl`, ~5 min). Types-only; no I/O in core.
 */

/**
 * A presigned S3 POST upload target. `url` is the bucket endpoint, `fields` are
 * the policy fields the client must echo in the multipart POST, and `key` is the
 * quarantine object key the upload will land at (so the caller can track it for
 * the later validate → promote steps).
 */
export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export interface CatalogueFileStore {
  // Mint a presigned upload target into the QUARANTINE prefix, scoped by
  // content-type and a byte ceiling (the S3 policy enforces both).
  mintUploadTarget(
    contentType: string,
    maxBytes: number,
  ): Promise<Result<PresignedUpload, RepositoryError>>;
  // Mint a short-lived (CloudFront-signed) READ url for a stored key. A missing
  // key surfaces as `SourceNotAvailable` rather than a generic store failure.
  mintSignedReadUrl(
    key: string,
    ttlSeconds: number,
  ): Promise<Result<string, SourceNotAvailable | RepositoryError>>;
  // Promote a validated quarantine object to its served `catalogue/<id>/…` key.
  promote(quarantineKey: string, servedKey: string): Promise<Result<void, RepositoryError>>;
}
