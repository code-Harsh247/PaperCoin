// Server-side copy of the rules UserNameModal enforces in the browser. The
// browser's check is for feedback; this one is the one that counts.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function validateUsername(username) {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    return 'Username must be 3-20 characters: letters, numbers, and underscores only';
  }
  return null;
}
