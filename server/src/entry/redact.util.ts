/**
 * Scrub a Postgres connection string from any value before it is logged. A Neon/Drizzle connection
 * or query failure can echo the nh_app url (it carries the password); CloudWatch is an
 * IAM-controlled sink, but the credential must never be written there in plaintext. Defence in
 * depth behind the generic-503 response (review A2 / NH-79).
 */
export function redactConnectionString(value: unknown): string {
  const text =
    value instanceof Error ? (value.stack ?? `${value.name}: ${value.message}`) : String(value);
  // Any postgres(ql):// URL (carries user:password@host) -> scrubbed, plus the literal env value
  // wherever it appears verbatim in the message or stack.
  let out = text.replaceAll(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[redacted]');
  const url = process.env.DATABASE_URL;
  if (url) out = out.split(url).join('[redacted-connection-string]');
  return out;
}
