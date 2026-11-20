// The one place that reads JWT_SECRET. It fails closed: if the secret is
// missing or too short, nothing signs or verifies tokens. There used to be a
// fallback literal in two places, which meant a deploy that forgot the env var
// would accept tokens anyone could mint for any user.
//
// No Node-only imports, so this works in the Edge runtime (middleware) too.

const MIN_LENGTH = 32;

export function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET is missing or shorter than ${MIN_LENGTH} characters; refusing to sign or verify tokens`
    );
  }
  return new TextEncoder().encode(raw);
}
