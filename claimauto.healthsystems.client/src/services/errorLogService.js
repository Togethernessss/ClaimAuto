/**
 * Session-level error log store.
 *
 * No backend call — errors are captured in memory for the current browser
 * session only. The axiosClient response interceptor feeds into this via
 * addError(). The AuditLogs page consumes it to show the admin a live
 * "Session Error Log" panel without needing a backend error-log endpoint.
 *
 * Max 50 entries kept (oldest dropped first).
 */

let errors = [];
const listeners = new Set();

function notify() {
  const snapshot = [...errors];
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Record a new error entry.
 * @param {{ status: number|null, method: string, url: string, message: string }} entry
 */
export function addError(entry) {
  const enriched = {
    id:        Date.now() + Math.random(), // unique enough for list keys
    timestamp: new Date().toISOString(),
    ...entry,
  };
  errors = [enriched, ...errors].slice(0, 50); // newest first, cap at 50
  notify();
}

/** Remove a single entry by id. */
export function dismissError(id) {
  errors = errors.filter((e) => e.id !== id);
  notify();
}

/** Wipe all captured errors. */
export function clearAllErrors() {
  errors = [];
  notify();
}

/** Snapshot of current errors (does not subscribe). */
export function getErrors() {
  return [...errors];
}

/**
 * Subscribe to error list changes.
 * @param {(errors: Array) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribeErrors(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
