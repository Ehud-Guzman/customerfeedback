/**
 * Canonical feedback constants.
 * These exist to keep analytics CLEAN and predictable.
 * Do not inline strings elsewhere — always import from here.
 */

// Visit frequency buckets
export const VISIT_FREQUENCY = new Set([
  "FIRST_TIME",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

// Why customers leave fast
export const FAST_EXIT_REASONS = new Set([
  "QUEUE",
  "NO_STOCK",
  "PRICE",
  "SERVICE",
  "OTHER",
]);

// Submission sources (channels)
export const SOURCES = new Set([
  "QR",
  "STAFF",
  "USSD",
  "PAPER",
]);

/**
 * Normalize a value against an allowed set.
 * - trims
 * - uppercases
 * - rejects unknown values
 *
 * @param {Set<string>} set
 * @param {any} value
 * @returns {string|null}
 */
export function normalizeEnum(set, value) {
  const v = String(value ?? "").trim().toUpperCase();
  return set.has(v) ? v : null;
}
