// ─── Date / Currency Formatting ─────────────────────────

export function formatDate(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

export function formatDateTime(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function formatCurrency(amount) {
    if (amount == null) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// ─── Fraud Score Styling ────────────────────────────────

export function scoreColor(score) {
    if (score >= 70) return { bg: '#fff0f0', color: '#c0392b', label: 'High Risk' };
    if (score >= 40) return { bg: '#fff8e6', color: '#e67e22', label: 'Medium Risk' };
    return { bg: '#eafaf1', color: '#27ae60', label: 'Low Risk' };
}

// ─── Case Priority Styling ──────────────────────────────

export function priorityStyle(priority) {
    const map = {
        Critical: { bg: '#c0392b', color: '#fff' },
        High: { bg: '#e74c3c', color: '#fff' },
        Medium: { bg: '#f39c12', color: '#fff' },
        Low: { bg: '#95a5a6', color: '#fff' },
    };
    return map[priority] || { bg: '#dee2e6', color: '#333' };
}

export function priorityIcon(priority) {
    const map = {
        Critical: 'bi-exclamation-octagon-fill',
        High: 'bi-exclamation-triangle-fill',
        Medium: 'bi-exclamation-circle-fill',
        Low: 'bi-info-circle-fill',
    };
    return map[priority] || 'bi-question-circle';
}

// ─── Case Status Styling ────────────────────────────────

export function caseStatusStyle(status) {
    const map = {
        Open: { bg: '#e74c3c', color: '#fff' },
        UnderInvestigation: { bg: '#f39c12', color: '#fff' },
        Resolved: { bg: '#27ae60', color: '#fff' },
        Escalated: { bg: '#8e44ad', color: '#fff' },
    };
    return map[status] || { bg: '#dee2e6', color: '#333' };
}

export function caseStatusIcon(status) {
    const map = {
        Open: 'bi-folder2-open',
        UnderInvestigation: 'bi-search',
        Resolved: 'bi-check-circle-fill',
        Escalated: 'bi-arrow-up-circle-fill',
    };
    return map[status] || 'bi-question-circle';
}

// ─── Outcome Styling ────────────────────────────────────

export function outcomeStyle(outcome) {
    const map = {
        Cleared: { bg: '#eafaf1', color: '#27ae60' },
        Confirmed: { bg: '#fff0f0', color: '#c0392b' },
        Escalated: { bg: '#f4ecf7', color: '#8e44ad' },
    };
    return map[outcome] || { bg: '#dee2e6', color: '#333' };
}

export function outcomeIcon(outcome) {
    const map = {
        Cleared: 'bi-shield-check',
        Confirmed: 'bi-shield-x',
        Escalated: 'bi-shield-exclamation',
    };
    return map[outcome] || 'bi-shield';
}

// ─── Constants ──────────────────────────────────────────

export const CASE_STATUSES = ['Open', 'UnderInvestigation', 'Resolved', 'Escalated'];
export const CASE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const CASE_OUTCOMES = ['Cleared', 'Confirmed', 'Escalated'];

export const OPEN_STATUSES = ['Open', 'UnderInvestigation'];