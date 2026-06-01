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

// ─── Appeal Status Styling ──────────────────────────────

export function statusStyle(status) {
    const map = {
        Filed: { bg: '#3498db', color: '#fff' },
        UnderReview: { bg: '#f39c12', color: '#fff' },
        Decided: { bg: '#27ae60', color: '#fff' },
        Withdrawn: { bg: '#95a5a6', color: '#fff' },
    };
    return map[status] || { bg: '#dee2e6', color: '#333' };
}

export function statusIcon(status) {
    const map = {
        Filed: 'bi-file-earmark-plus',
        UnderReview: 'bi-hourglass-split',
        Decided: 'bi-check-circle-fill',
        Withdrawn: 'bi-x-circle-fill',
    };
    return map[status] || 'bi-question-circle';
}

// ─── Appeal Outcome Styling ─────────────────────────────

export function outcomeStyle(outcome) {
    const map = {
        Upheld: { bg: '#fff0f0', color: '#c0392b' },
        Overturned: { bg: '#eafaf1', color: '#27ae60' },
        PartiallyUpheld: { bg: '#fff8e6', color: '#e67e22' },
    };
    return map[outcome] || { bg: '#dee2e6', color: '#333' };
}

export function outcomeIcon(outcome) {
    const map = {
        Upheld: 'bi-hand-thumbs-down',
        Overturned: 'bi-hand-thumbs-up',
        PartiallyUpheld: 'bi-hand-index-thumb',
    };
    return map[outcome] || 'bi-question-circle';
}

export function outcomeLabel(outcome) {
    const map = {
        Upheld: 'Upheld — Original decision stands',
        Overturned: 'Overturned — Claim reset to Submitted',
        PartiallyUpheld: 'Partially Upheld — Partial revision',
    };
    return map[outcome] || outcome;
}

// ─── Constants ──────────────────────────────────────────

export const APPEAL_STATUSES = ['Filed', 'UnderReview', 'Decided', 'Withdrawn'];
export const APPEAL_OUTCOMES = ['Upheld', 'Overturned', 'PartiallyUpheld'];
export const ACTIVE_STATUSES = ['Filed', 'UnderReview'];