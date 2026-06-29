// Scrub a Postgres connection string from any value before it is logged. A Neon/Drizzle (runtime)
// or postgres.js (seed) connection/query failure can echo a url or DSN fields that carry the
// password; CloudWatch and CI logs are IAM/secret-masked sinks, but the credential must never be
// written there in plaintext. Defence in depth behind the generic-503 response (NH-79 review A2/F7).
// Lives in core/ (framework-free, zero imports) so BOTH entry/ (the Lambda) and adapters/ (the seed
// runner) can import it without crossing the hexagon's dependency fence.
export function redactConnectionString(value: unknown): string {
  let out = serializeError(value);
  // 1) Any postgres(ql)://user:password@host url -> scrubbed.
  out = out.replaceAll(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[redacted]');
  // 2) DSN keyword form a driver may print field-by-field (postgres.js) -> scrub the password token.
  out = out.replaceAll(/password=\S+/gi, 'password=[redacted]');
  // 3) The literal active connection string wherever it appears verbatim (a backstop for any shape
  //    the regexes above miss). DATABASE_URL is the var both the Lambda and the seed runner use.
  const url = process.env.DATABASE_URL;
  if (url) out = out.split(url).join('[redacted-connection-string]');
  return out;
}

// Serialize a value INCLUDING an Error's cause chain. Node's Error.stack does not include
// error.cause, so a credential nested in cause.message would otherwise escape the scrub (NH-79
// review F7b). A non-Error head value, or a non-Error tail cause, is serialized too so a url inside
// it is still scrubbed.
function serializeError(value: unknown): string {
  const parts: string[] = [];
  let current: unknown = value;
  let depth = 0;
  while (current instanceof Error && depth < 6) {
    parts.push(current.stack ?? `${current.name}: ${current.message}`);
    current = (current as { cause?: unknown }).cause;
    depth += 1;
  }
  if (current !== undefined && !(current instanceof Error)) parts.push(asText(current));
  return parts.join('\n');
}

// JSON (not String) so a plain object surfaces its fields for scrubbing instead of the useless
// '[object Object]'; strings pass through as-is; unserializable values degrade safely.
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
