// Helpers so secrets never appear in full in logs.
export function maskSecret(value: string): string {
  if (!value) return '(not set)';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/** Hides the password in a MongoDB URI: mongodb+srv://user:****@host/db */
export function maskMongoUri(uri: string): string {
  if (!uri) return '(not set)';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:/@]+):[^@]+@/, '$1:****@');
}
