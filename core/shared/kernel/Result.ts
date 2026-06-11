/**
 * Result<T, E> — an explicit success/failure value used across the domain so
 * pure functions can fail without throwing. Discriminated on the `ok` literal:
 * `ok: true` narrows to the success arm (`.value`), `ok: false` to the failure
 * arm (`.error`).
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wrap a value as a success Result. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wrap an error as a failure Result. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
