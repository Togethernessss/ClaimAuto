// ─── Date / Currency formatting ─────────────────────────
export function formatDateTime(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function formatDate(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

// ─── Priority styling ───────────────────────────────────
export function priorityStyle(p) {
    switch (p) {
        case 'High': return { bg: '#fee2e2', color: '#991b1b' };
        case 'Medium': return { bg: '#fef9c3', color: '#854d0e' };
        case 'Low': return { bg: '#dcfce7', color: '#166534' };
        default: return { bg: '#f3f4f6', color: '#374151' };
    }
}

export function priorityIcon(p) {
    switch (p) {
        case 'High': return 'bi-exclamation-triangle-fill';
        case 'Medium': return 'bi-dash-circle-fill';
        case 'Low': return 'bi-arrow-down-circle-fill';
        default: return 'bi-question-circle';
    }
}

// ─── Status styling ─────────────────────────────────────
export function statusStyle(s) {
    switch (s) {
        case 'Pending': return { bg: '#dbeafe', color: '#1e40af' };
        case 'InProgress': return { bg: '#fef9c3', color: '#854d0e' };
        case 'Completed': return { bg: '#dcfce7', color: '#166534' };
        case 'Overdue': return { bg: '#fee2e2', color: '#991b1b' };
        default: return { bg: '#f3f4f6', color: '#374151' };
    }
}

export function statusIcon(s) {
    switch (s) {
        case 'Pending': return 'bi-hourglass-split';
        case 'InProgress': return 'bi-arrow-repeat';
        case 'Completed': return 'bi-check-circle-fill';
        case 'Overdue': return 'bi-alarm-fill';
        default: return 'bi-question-circle';
    }
}

// ─── Due-date urgency ───────────────────────────────────
export function dueUrgency(iso, status) {
    if (!iso || status === 'Completed') return null;
    const now = new Date();
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; const due = new Date(utcIso);
    const diff = (due - now) / (1000 * 60 * 60 * 24); // days
    if (diff < 0) return { label: 'Overdue', color: '#dc2626' };
    if (diff <= 2) return { label: 'Due soon', color: '#f59e0b' };
    return null;
}

// ─── Active statuses (for summary count) ────────────────
export const ACTIVE_STATUSES = ['Pending', 'InProgress', 'Overdue'];