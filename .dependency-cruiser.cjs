/**
 * dependency-cruiser — Hexagonal dependency-direction fence (ARCH-GUARD-1), run via
 * `pnpm run depcheck` (part of the required "CI Green" aggregation). Scans `server/src`.
 *
 * The hexagon lives as folders under server/src/ (ARCH-HEX-1):
 *   core/     framework-free domain — may import ONLY Node builtins + core + zod (fail-CLOSED)
 *   adapters/ I/O implementing ports — may import core + adapters (Nest decorators allowed)
 *   modules/  NestJS wiring ("the door") — may import core + adapters + modules
 *
 * `core-purity` is fail-CLOSED, per ADR ARCH-GUARD-1: it is an ALLOW-LIST (anything not
 * explicitly permitted errors by default), NOT a deny-list. A deny-list can silently match zero
 * edges and pass green while core/ freely imports an unlisted framework (e.g. react, drizzle).
 * tooling/check-core-purity-canary.sh plants a deliberate core/ -> @nestjs/common import and
 * asserts depcruise rejects it (the `core-purity` rule), so the fence is verified, not assumed.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-purity',
      comment:
        'server/src/core is the framework-free domain. It may import ONLY Node builtins, other ' +
        'core modules, and the explicit allow-list (zod). Anything else — @nestjs, adapters, ' +
        '@aws-sdk, @pulumi, react, drizzle, any other package — is an error. FAIL-CLOSED: the ' +
        '`to` is an allow-list (pathNot keeps own-core + zod; dependencyTypesNot keeps Node ' +
        'builtins), so any unlisted import matches and errors by default. ' +
        'tooling/check-core-purity-canary.sh proves it fires.',
      severity: 'error',
      from: { path: '^server/src/core/' },
      to: {
        pathNot: ['^server/src/core/', 'node_modules/zod/'],
        dependencyTypesNot: ['core'],
      },
    },
    {
      name: 'no-adapters-to-modules',
      comment:
        'adapters implement ports against core; they may import core + adapters, but never ' +
        "modules (the Nest wiring) — that would invert the hexagon's dependency direction.",
      severity: 'error',
      from: { path: '^server/src/adapters/' },
      to: { path: '^server/src/modules/' },
    },
    {
      name: 'no-circular',
      comment: 'Cyclic dependencies are forbidden.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'Non-test modules should be reachable from an entry point.',
      severity: 'error',
      from: {
        orphan: true,
        pathNot: [
          '\\.(test|spec)\\.(ts|tsx)$',
          '\\.stories\\.(ts|tsx)$',
          '^server/src/main\\.ts$',
          '^server/src/adapters/neon-postgres/seed\\.util\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)dist/' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
