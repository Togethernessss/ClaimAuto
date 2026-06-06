// src/services/toastService.js
// ---------------------------------------------------------------------------
// Lightweight module-level pub-sub toast store — no React context required.
// Works across navigation because the module singleton persists in memory.
// ---------------------------------------------------------------------------

let toasts = [];
const listeners = new Set();

function notify() {
  const snapshot = [...toasts];
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Add a toast.
 * @param {{ type?: 'success'|'error'|'warning'|'info', title?: string, message: string, duration?: number }} opts
 * @returns {number} id — pass to dismissToast() to remove early
 */
export function addToast({ type = 'info', title, message, duration = 4500 }) {
  const id = Date.now() + Math.random();
  toasts = [{ id, type, title, message }, ...toasts].slice(0, 6); // cap at 6
  notify();
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

/** Remove a toast by id. */
export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

/**
 * Subscribe to toast list changes.
 * @param {(toasts: Array) => void} fn  Called immediately with current snapshot.
 * @returns {() => void} unsubscribe
 */
export function subscribeToasts(fn) {
  listeners.add(fn);
  fn([...toasts]); // immediate snapshot so ToastContainer catches pre-mount toasts
  return () => listeners.delete(fn);
}

// ── Convenience shortcuts ──────────────────────────────────────────────────
export const toast = {
  success: (message, title = 'Success') =>
    addToast({ type: 'success', title, message }),
  error: (message, title = 'Error') =>
    addToast({ type: 'error', title, message, duration: 7000 }),
  warning: (message, title = 'Warning') =>
    addToast({ type: 'warning', title, message }),
  info: (message, title = 'Info') =>
    addToast({ type: 'info', title, message }),
};
