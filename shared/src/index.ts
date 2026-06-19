// Shared FE<->BE contract surface for Notation Hero.
//
// The typed oRPC contract + Zod schemas (spike 2026-06-20 §3) land here with
// their feature work and are imported by BOTH `client` and `server`, giving the
// end-to-end type safety that is the whole point of oRPC. This placeholder keeps
// the package importable and type-checked in the skeleton.
export const SHARED_API_VERSION = "v1" as const;
export type SharedApiVersion = typeof SHARED_API_VERSION;
