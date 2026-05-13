// Shape of an audit log entry received from GET /api/auditlogs.
// Mirrors backend's AuditLogResponseDto exactly.
//
// Example object you'll receive in the array:
// {
//   auditID: 47,
//   userID: 1,
//   userName: "System Administrator",
//   action: "Login",
//   resourceType: "User",
//   resourceID: "1",
//   detailsJSON: "{\"ip\":\"127.0.0.1\"}",
//   timestamp: "2026-05-11T05:00:13.4027459Z"
// }
export class AuditLogDto {
  constructor({
    auditID,
    userID,
    userName,
    action,
    resourceType,
    resourceID,
    detailsJSON,
    timestamp,
  } = {}) {
    this.auditID = auditID;
    this.userID = userID;
    this.userName = userName ?? 'Unknown';
    this.action = action ?? '';
    this.resourceType = resourceType ?? null;
    this.resourceID = resourceID ?? null;
    this.detailsJSON = detailsJSON ?? null;
    this.timestamp = timestamp
  ? new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z')
  : null;
  }

  // ── Helpers for the UI ─────────────────────────────────────

  // Returns the parsed JSON object, or null if details is missing/invalid
  get parsedDetails() {
    if (!this.detailsJSON) return null;
    try {
      return JSON.parse(this.detailsJSON);
    } catch {
      return { raw: this.detailsJSON };
    }
  }

  // Categorize the action for badge coloring in the UI
  get actionCategory() {
    const a = this.action.toLowerCase();
    if (a.includes('login') || a.includes('register') || a.startsWith('create')) return 'create';
    if (a.startsWith('update') || a.includes('activate') || a.includes('confirm')) return 'update';
    if (a.startsWith('delete') || a.includes('disable') || a.includes('deactivate') || a.includes('reject')) return 'delete';
    if (a.includes('adjudicate') || a.includes('authorize') || a.includes('execute') || a.includes('decide')) return 'process';
    return 'info';
  }

  // Human-friendly "resource" label for the table column
  get resourceLabel() {
    if (!this.resourceType) return '—';
    return this.resourceID ? `${this.resourceType} #${this.resourceID}` : this.resourceType;
  }

    // Human-friendly relative time string (e.g., "2 minutes ago", "3 hours ago", "5 days ago").
  // Falls back to absolute date for anything older than ~30 days.
  get relativeTime() {
    if (!this.timestamp) return '—';
    const seconds = Math.floor((Date.now() - this.timestamp.getTime()) / 1000);

    if (seconds < 30)        return 'just now';
    if (seconds < 60)        return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)        return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24)          return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30)           return `${days}d ago`;

    // Older than 30 days — just show the date
    return this.timestamp.toLocaleDateString();
  }

  // Absolute timestamp formatted for tooltip / detail modal.
  // Example: "May 13, 2026, 11:16:00 AM"
  get absoluteTime() {
    if (!this.timestamp) return '—';
    return this.timestamp.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}