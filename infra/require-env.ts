/** Read a required env var or throw with a remediation hint (passed by deploy.yml / local export). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required. In CI it is passed from a GitHub Actions secret to the \`pulumi up\` ` +
        `step (deploy.yml); for a local \`pulumi preview\`/\`up\`, export it first (see infra/README.md).`,
    );
  }
  return value;
}
