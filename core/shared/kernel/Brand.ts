/**
 * Brand<T, B> — a nominal-typing helper. Intersects a base type `T` with a
 * phantom `__brand` tag so two values with the same runtime shape (e.g. two
 * `string` ids) are not assignable to each other at the type level. The
 * `__brand` field exists only in the type system; it is never present at
 * runtime.
 *
 * Example (lands in U2.2 `ids.ts`):
 *   type CatalogueItemId = Brand<string, 'CatalogueItemId'>;
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };
