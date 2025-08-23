/**
 * Generate a unique ID using crypto.randomUUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate an ISO timestamp for the current moment
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}
