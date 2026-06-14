/**
 * Hello-world Lambda handler (KAN-119) — the AWS proof-of-life.
 *
 * Pure runtime code: no `@pulumi/*` imports (depcruise H8). The infra stack
 * packages this file's esbuild BUILD OUTPUT (apps/handler-hello/dist) via
 * FileArchive — never its source (H4). Bundled cjs/node22 → Lambda `index.handler`.
 */
type HelloResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export const handler = async (): Promise<HelloResponse> => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "hello from notation-hero" }),
});
